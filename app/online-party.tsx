import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  OnlinePartyConnection,
  connectOnlinePartyRoom,
  createOnlinePartyRoom,
  isOnlinePartyConfigured,
  joinOnlinePartyRoom,
} from '../services/online-party';
import { OnlinePartyState, normalizeRoomCode } from '../shared/online-party';
import { isCompleteTemperatureGuess, sanitizeTemperatureGuess, toggleMinusInGuess } from '../engine/guess-input';

type ScreenMode = 'menu' | 'host' | 'join' | 'room';

export default function OnlinePartyScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const colors = isDark ? Colors.dark : Colors.light;
  const [mode, setMode] = useState<ScreenMode>('menu');
  const [name, setName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [state, setState] = useState<OnlinePartyState | null>(null);
  const [guess, setGuess] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const connectionRef = useRef<OnlinePartyConnection | null>(null);

  const me = state?.players.find(player => player.id === playerId);
  const currentPlayer = state?.players.find(player => player.id === state.currentPlayerId);
  const isMyTurn = state?.phase === 'guessing' && state.currentPlayerId === playerId;
  const canContinue = Boolean(state?.phase === 'revealed' && (me?.isHost || isMyTurn));

  useEffect(() => {
    return () => connectionRef.current?.close();
  }, []);

  useEffect(() => {
    if (state?.phase === 'guessing') {
      setGuess('');
    }
  }, [state?.phase, state?.roundIndex]);

  const showError = (message: string) => {
    Alert.alert(t('onlineParty'), message);
  };

  const connect = (nextRoomCode: string, nextPlayerId: string) => {
    connectionRef.current?.close();
    connectionRef.current = connectOnlinePartyRoom(nextRoomCode, nextPlayerId, {
      onState: setState,
      onError: showError,
      onStatusChange: setConnected,
    });
  };

  const handleHost = async () => {
    if (!name.trim()) return;
    if (!isOnlinePartyConfigured()) {
      showError(t('onlinePartyUnavailable'));
      return;
    }

    setLoading(true);
    try {
      const response = await createOnlinePartyRoom(name.trim());
      setRoomCode(response.roomCode);
      setPlayerId(response.playerId);
      setState(response.state);
      setMode('room');
      connect(response.roomCode, response.playerId);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not create room.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const normalizedCode = normalizeRoomCode(roomCodeInput);
    if (!name.trim() || !normalizedCode) return;
    if (!isOnlinePartyConfigured()) {
      showError(t('onlinePartyUnavailable'));
      return;
    }

    setLoading(true);
    try {
      const response = await joinOnlinePartyRoom(normalizedCode, name.trim());
      setRoomCode(response.roomCode);
      setPlayerId(response.playerId);
      setState(response.state);
      setMode('room');
      connect(response.roomCode, response.playerId);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not join room.');
    } finally {
      setLoading(false);
    }
  };

  const sendStart = () => connectionRef.current?.send({ type: 'start' });
  const sendNext = () => connectionRef.current?.send({ type: 'next' });
  const sendGuess = () => {
    if (!isCompleteTemperatureGuess(guess)) return;
    connectionRef.current?.send({ type: 'submitGuess', guess: parseFloat(guess) });
  };

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <Pressable onPress={() => router.back()} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('back')}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('onlineParty')}</Text>
      <View style={styles.iconButton} />
    </View>
  );

  const renderMenu = () => (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.foreground }]}>{t('onlineParty')}</Text>
      <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => setMode('host')}>
        <Ionicons name="add-circle" size={20} color={colors.primaryForeground} />
        <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{t('hostGame')}</Text>
      </Pressable>
      <Pressable style={[styles.primaryButton, { backgroundColor: colors.secondary }]} onPress={() => setMode('join')}>
        <Ionicons name="enter" size={20} color={colors.secondaryForeground} />
        <Text style={[styles.buttonText, { color: colors.secondaryForeground }]}>{t('joinGame')}</Text>
      </Pressable>
    </View>
  );

  const renderNameInput = (label: string, submitLabel: string, onSubmit: () => void) => (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.foreground }]}>{t('yourName')}</Text>
      <TextInput
        style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
        value={name}
        onChangeText={setName}
        placeholder="Alex"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="words"
      />
      {mode === 'join' && (
        <>
          <Text style={[styles.label, { color: colors.foreground }]}>{t('roomCode')}</Text>
          <TextInput
            style={[styles.textInput, styles.codeInput, { color: colors.foreground, borderColor: colors.border }]}
            value={roomCodeInput}
            onChangeText={(text) => setRoomCodeInput(normalizeRoomCode(text))}
            placeholder="ABCDE"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            maxLength={6}
          />
        </>
      )}
      <Pressable
        style={[
          styles.primaryButton,
          { backgroundColor: colors.primary },
          (!name.trim() || (mode === 'join' && !roomCodeInput)) && styles.disabledButton,
        ]}
        onPress={onSubmit}
        disabled={!name.trim() || (mode === 'join' && !roomCodeInput)}
      >
        {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{submitLabel}</Text>}
      </Pressable>
      <Pressable style={styles.secondaryAction} onPress={() => setMode('menu')}>
        <Text style={[styles.secondaryText, { color: colors.primary }]}>{label}</Text>
      </Pressable>
    </View>
  );

  const renderLobby = () => (
    <View style={styles.section}>
      <Text style={[styles.roomCode, { color: colors.foreground }]}>{roomCode}</Text>
      <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{t('copyCode')}</Text>
      <Text style={[styles.statusText, { color: connected ? colors.chart3 : colors.destructive }]}>
        {connected ? t('connected') : t('disconnected')}
      </Text>
      <Text style={[styles.label, { color: colors.foreground }]}>{t('waitingForPlayers')}</Text>
      {state?.players.map(player => (
        <View key={player.id} style={[styles.playerRow, { borderColor: colors.border }]}>
          <Text style={[styles.playerName, { color: colors.foreground }]}>{player.name}</Text>
          <Text style={{ color: player.connected ? colors.chart3 : colors.mutedForeground }}>
            {player.connected ? t('connected') : t('disconnected')}
          </Text>
        </View>
      ))}
      {me?.isHost && (
        <Pressable
          style={[styles.primaryButton, { backgroundColor: colors.primary }, (state?.players.length || 0) < 2 && styles.disabledButton]}
          onPress={sendStart}
          disabled={(state?.players.length || 0) < 2}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{t('startOnlineGame')}</Text>
        </Pressable>
      )}
    </View>
  );

  const renderGame = () => (
    <View style={styles.section}>
      <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
        {state?.roundIndex} / {state?.totalRounds}
      </Text>
      <View style={[styles.cityCard, { backgroundColor: `${colors.primary}14` }]}>
        <Ionicons name="location" size={42} color={colors.primary} />
        <Text style={[styles.cityName, { color: colors.foreground }]}>{state?.currentCity?.city}</Text>
        <Text style={[styles.countryName, { color: colors.mutedForeground }]}>{state?.currentCity?.country}</Text>
      </View>
      <Text style={[styles.turnText, { color: isMyTurn ? colors.primary : colors.mutedForeground }]}>
        {isMyTurn ? t('yourTurn') : t('onlyCurrentPlayerCanAnswer', { name: currentPlayer?.name || '' })}
      </Text>
      {state?.phase === 'guessing' && (
        <View style={styles.inputSection}>
          <View style={styles.guessRow}>
            <Pressable
              style={[styles.minusButton, { borderColor: colors.border, backgroundColor: `${colors.muted}80` }]}
              onPress={() => setGuess(toggleMinusInGuess)}
              disabled={!isMyTurn}
            >
              <Text style={[styles.minusText, { color: colors.foreground }]}>+/-</Text>
            </Pressable>
            <TextInput
              style={[styles.guessInput, { color: colors.foreground, borderBottomColor: colors.primary }]}
              value={guess}
              onChangeText={(text) => setGuess(sanitizeTemperatureGuess(text))}
              editable={isMyTurn}
              keyboardType="numbers-and-punctuation"
              placeholder="--"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.unitText, { color: colors.mutedForeground }]}>°C</Text>
          </View>
          {isMyTurn && (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.primary }, !isCompleteTemperatureGuess(guess) && styles.disabledButton]}
              onPress={sendGuess}
              disabled={!isCompleteTemperatureGuess(guess)}
            >
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{t('submitGuess')}</Text>
            </Pressable>
          )}
        </View>
      )}
      {state?.phase === 'revealed' && state.lastGuess && (
        <View style={styles.resultBlock}>
          <Ionicons
            name={state.lastGuess.correct ? 'checkmark-circle' : 'close-circle'}
            size={56}
            color={state.lastGuess.correct ? colors.chart3 : colors.destructive}
          />
          <Text style={[styles.resultText, { color: colors.foreground }]}>
            {state.lastGuess.guess}°C → {state.lastGuess.actual}°C
          </Text>
          {canContinue && (
            <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={sendNext}>
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{t('nextCity')}</Text>
            </Pressable>
          )}
        </View>
      )}
      {renderScoreboard()}
    </View>
  );

  const renderScoreboard = () => (
    <View style={[styles.scoreboard, { backgroundColor: colors.card }]}>
      {state?.players.map(player => (
        <View key={player.id} style={styles.scoreItem}>
          <Text style={[styles.scoreName, { color: colors.mutedForeground }]} numberOfLines={1}>{player.name}</Text>
          <Text style={[styles.scoreValue, { color: colors.primary }]}>{player.score}</Text>
        </View>
      ))}
    </View>
  );

  const renderComplete = () => (
    <View style={styles.section}>
      <Ionicons name="trophy" size={72} color={colors.chart2} />
      <Text style={[styles.title, { color: colors.foreground }]}>{t('roundComplete')}</Text>
      {renderScoreboard()}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderTopBar()}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {mode === 'menu' && renderMenu()}
        {mode === 'host' && renderNameInput(t('joinGame'), t('hostGame'), handleHost)}
        {mode === 'join' && renderNameInput(t('hostGame'), t('joinGame'), handleJoin)}
        {mode === 'room' && state?.phase === 'lobby' && renderLobby()}
        {mode === 'room' && (state?.phase === 'guessing' || state?.phase === 'revealed') && renderGame()}
        {mode === 'room' && state?.phase === 'complete' && renderComplete()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { alignItems: 'center', gap: 16 },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
  label: { alignSelf: 'stretch', fontSize: 16, fontWeight: '700', marginTop: 8 },
  primaryButton: {
    width: '100%',
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: { fontSize: 18, fontWeight: '700' },
  disabledButton: { opacity: 0.45 },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
  },
  codeInput: { textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  secondaryAction: { padding: 10 },
  secondaryText: { fontSize: 16, fontWeight: '700' },
  roomCode: { fontSize: 42, fontWeight: '900', letterSpacing: 4 },
  statusText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  playerRow: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: { fontSize: 16, fontWeight: '700', maxWidth: '60%' },
  cityCard: { width: '100%', alignItems: 'center', borderRadius: 18, padding: 22 },
  cityName: { fontSize: 30, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  countryName: { fontSize: 17, marginTop: 4, textAlign: 'center' },
  turnText: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  inputSection: { width: '100%', alignItems: 'center', gap: 16 },
  guessRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  minusButton: { minWidth: 60, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  minusText: { fontSize: 18, fontWeight: '800' },
  guessInput: { width: 132, borderBottomWidth: 4, paddingVertical: 8, textAlign: 'center', fontSize: 44, fontWeight: '800' },
  unitText: { fontSize: 32, fontWeight: '700' },
  resultBlock: { width: '100%', alignItems: 'center', gap: 14 },
  resultText: { fontSize: 22, fontWeight: '800' },
  scoreboard: {
    width: '100%',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 12,
  },
  scoreItem: { minWidth: 76, alignItems: 'center', flexGrow: 1 },
  scoreName: { maxWidth: 92, fontSize: 13, fontWeight: '700' },
  scoreValue: { fontSize: 28, fontWeight: '900', marginTop: 4 },
});
