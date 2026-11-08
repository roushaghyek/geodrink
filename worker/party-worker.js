import { CITIES } from './cities.js';
import { handleWeatherRequest } from './weather-proxy';

const ROOM_TTL_MS = 45 * 60 * 1000;
const MAX_PLAYERS = 8;
const TOTAL_ROUNDS_PER_PLAYER = 10;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
  });
}

function randomId() {
  return crypto.randomUUID();
}

function randomRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function normalizeRoomCode(code) {
  return String(code || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6);
}

function withoutTemperature(city) {
  const { temperature, ...safeCity } = city;
  return safeCity;
}

function getBalancedRandomCities(count) {
  const pool = [...CITIES];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length)).map(withoutTemperature);
}

async function getCurrentTemperature(env, city) {
  if (!env.OPENWEATHER_API_KEY) {
    return mockTemperature(city.lat);
  }

  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  url.searchParams.set('lat', String(city.lat));
  url.searchParams.set('lon', String(city.lon));
  url.searchParams.set('units', 'metric');
  url.searchParams.set('appid', env.OPENWEATHER_API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return mockTemperature(city.lat);
  }

  const data = await response.json();
  return Math.round(Number(data.main.temp));
}

function mockTemperature(lat) {
  const absLat = Math.abs(lat);
  if (absLat < 23.5) return Math.floor(Math.random() * 10) + 25;
  if (absLat < 66.5) return Math.floor(Math.random() * 20) + 8;
  return Math.floor(Math.random() * 20) - 20;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return json({});
    }

    const weatherResponse = await handleWeatherRequest(request, env, {
      fetch: (input) => fetch(input),
      cache: caches.default,
      waitUntil: (promise) => ctx.waitUntil(promise),
    });
    if (weatherResponse) {
      return weatherResponse;
    }

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (request.method === 'POST' && parts.length === 1 && parts[0] === 'rooms') {
      const roomCode = randomRoomCode();
      const id = env.PARTY_ROOMS.idFromName(roomCode);
      return env.PARTY_ROOMS.get(id).fetch(new Request(`${url.origin}/rooms/${roomCode}/create`, request));
    }

    if (parts[0] === 'rooms' && parts[1]) {
      const roomCode = normalizeRoomCode(parts[1]);
      const id = env.PARTY_ROOMS.idFromName(roomCode);
      return env.PARTY_ROOMS.get(id).fetch(request);
    }

    return json({ message: 'Not found' }, 404);
  },
};

export class PartyRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();

    this.state.getWebSockets().forEach((ws) => {
      const attachment = ws.deserializeAttachment();
      if (attachment?.playerId) {
        this.sessions.set(ws, attachment.playerId);
      }
    });
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.connect(request);
    }

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const action = parts[2];

    if (request.method === 'POST' && action === 'create') {
      return this.createRoom(request, parts[1]);
    }

    if (request.method === 'POST' && action === 'join') {
      return this.joinRoom(request, parts[1]);
    }

    return json({ message: 'Room endpoint not found' }, 404);
  }

  async createRoom(request, roomCode) {
    const existing = await this.getRoom();
    if (existing) {
      return json({ message: 'Room code collision. Try again.' }, 409);
    }

    const body = await request.json().catch(() => ({}));
    const playerName = cleanName(body.playerName) || 'Host';
    const playerId = randomId();
    const totalRounds = TOTAL_ROUNDS_PER_PLAYER;
    const room = {
      roomCode: normalizeRoomCode(roomCode),
      phase: 'lobby',
      players: [{ id: playerId, name: playerName, score: 0, connected: false, isHost: true }],
      currentPlayerId: null,
      currentCity: null,
      cityOrder: [],
      roundIndex: 0,
      totalRounds,
      lastGuess: null,
      updatedAt: Date.now(),
    };

    await this.saveRoom(room);
    return json({ roomCode: room.roomCode, playerId, state: this.publicState(room) });
  }

  async joinRoom(request) {
    const room = await this.getRoom();
    if (!room) {
      return json({ message: 'Room not found' }, 404);
    }
    if (room.phase !== 'lobby') {
      return json({ message: 'This game has already started.' }, 409);
    }
    if (room.players.length >= MAX_PLAYERS) {
      return json({ message: 'Room is full.' }, 409);
    }

    const body = await request.json().catch(() => ({}));
    const playerName = cleanName(body.playerName) || `Player ${room.players.length + 1}`;
    const playerId = randomId();
    room.players.push({ id: playerId, name: playerName, score: 0, connected: false, isHost: false });
    room.updatedAt = Date.now();

    await this.saveRoom(room);
    this.broadcast(room);
    return json({ roomCode: room.roomCode, playerId, state: this.publicState(room) });
  }

  async connect(request) {
    const room = await this.getRoom();
    if (!room) {
      return json({ message: 'Room not found' }, 404);
    }

    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId');
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (!player) {
      return json({ message: 'Unknown player' }, 403);
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ playerId });
    this.sessions.set(server, playerId);

    player.connected = true;
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    server.send(JSON.stringify({ type: 'state', state: this.publicState(room) }));
    this.broadcast(room);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    let event;
    try {
      event = JSON.parse(message);
    } catch {
      this.sendError(ws, 'Invalid message.');
      return;
    }

    const playerId = this.sessions.get(ws);
    const room = await this.getRoom();
    if (!room || !playerId) return;

    try {
      if (event.type === 'start') {
        await this.startRoom(room, playerId);
      } else if (event.type === 'submitGuess') {
        await this.submitGuess(room, playerId, Number(event.guess));
      } else if (event.type === 'next') {
        await this.nextRound(room, playerId);
      } else if (event.type === 'ping') {
        room.updatedAt = Date.now();
        await this.saveRoom(room);
      }
    } catch (error) {
      this.sendError(ws, error.message || 'Room action failed.');
    }
  }

  async webSocketClose(ws) {
    await this.markDisconnected(ws);
  }

  async webSocketError(ws) {
    await this.markDisconnected(ws);
  }

  async markDisconnected(ws) {
    const playerId = this.sessions.get(ws);
    this.sessions.delete(ws);
    const room = await this.getRoom();
    if (!room || !playerId) return;
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (player) {
      player.connected = false;
      room.updatedAt = Date.now();
      await this.saveRoom(room);
      this.broadcast(room);
    }
  }

  async startRoom(room, playerId) {
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (!player?.isHost) throw new Error('Only the host can start the game.');
    if (room.players.length < 2) throw new Error('At least two players are required.');
    if (room.phase !== 'lobby') throw new Error('The game has already started.');

    room.totalRounds = room.players.length * TOTAL_ROUNDS_PER_PLAYER;
    room.cityOrder = getBalancedRandomCities(room.totalRounds);
    room.roundIndex = 1;
    room.currentPlayerId = room.players[0].id;
    room.currentCity = room.cityOrder[0];
    room.phase = 'guessing';
    room.lastGuess = null;
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    this.broadcast(room);
  }

  async submitGuess(room, playerId, guess) {
    if (room.phase !== 'guessing') throw new Error('The room is not accepting guesses.');
    if (room.currentPlayerId !== playerId) throw new Error('It is not your turn.');
    if (!Number.isFinite(guess)) throw new Error('Enter a valid guess.');

    const actual = await getCurrentTemperature(this.env, room.currentCity);
    const difference = Math.abs(guess - actual);
    const correct = difference <= 2;
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (correct && player) player.score += 1;

    room.currentCity = { ...room.currentCity, temperature: actual };
    room.lastGuess = { playerId, guess, actual, correct, difference };
    room.phase = 'revealed';
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    this.broadcast(room);
  }

  async nextRound(room, playerId) {
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (!player?.isHost && room.currentPlayerId !== playerId) {
      throw new Error('Only the host or current player can continue.');
    }
    if (room.phase !== 'revealed') throw new Error('Reveal the result first.');

    if (room.roundIndex >= room.totalRounds) {
      room.phase = 'complete';
      room.currentCity = null;
      room.currentPlayerId = null;
      room.updatedAt = Date.now();
      await this.saveRoom(room);
      this.broadcast(room);
      return;
    }

    room.roundIndex += 1;
    const nextPlayerIndex = (room.roundIndex - 1) % room.players.length;
    room.currentPlayerId = room.players[nextPlayerIndex].id;
    room.currentCity = room.cityOrder[room.roundIndex - 1];
    room.lastGuess = null;
    room.phase = 'guessing';
    room.updatedAt = Date.now();
    await this.saveRoom(room);
    this.broadcast(room);
  }

  publicState(room) {
    const { cityOrder, ...state } = room;
    return {
      ...state,
      currentCity: state.phase === 'revealed' ? state.currentCity : withoutTemperature(state.currentCity || {}),
    };
  }

  async getRoom() {
    return this.state.storage.get('room');
  }

  async saveRoom(room) {
    await this.state.storage.put('room', room);
    await this.state.storage.setAlarm(Date.now() + ROOM_TTL_MS);
  }

  async alarm() {
    const room = await this.getRoom();
    if (!room || Date.now() - room.updatedAt >= ROOM_TTL_MS) {
      await this.state.storage.deleteAll();
      this.state.getWebSockets().forEach((ws) => ws.close(1000, 'Room expired'));
      return;
    }
    await this.state.storage.setAlarm(room.updatedAt + ROOM_TTL_MS);
  }

  broadcast(room) {
    const message = JSON.stringify({ type: 'state', state: this.publicState(room) });
    this.state.getWebSockets().forEach((ws) => {
      try {
        ws.send(message);
      } catch {
        ws.close();
      }
    });
  }

  sendError(ws, message) {
    ws.send(JSON.stringify({ type: 'error', message }));
  }
}

function cleanName(name) {
  return String(name || '').trim().slice(0, 24);
}
