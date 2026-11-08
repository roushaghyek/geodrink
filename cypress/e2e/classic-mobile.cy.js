const byLabel = (label) => `[aria-label="${label}"]`;

function stubWeather() {
  // The e2e build points EXPO_PUBLIC_WEATHR_API_URL at /e2e-api (see package.json).
  const observation = { tempC: 20, observedAt: Date.now(), fetchedAt: Date.now() };
  cy.intercept('GET', '**/e2e-api/weather?**', { statusCode: 200, body: { observation } }).as('weather');
  cy.intercept('POST', '**/e2e-api/weather/batch', (request) => {
    request.reply({ statusCode: 200, body: { results: request.body.points.map(() => observation) } });
  }).as('weather');
}

describe('classic mode mobile flow', () => {
  beforeEach(() => {
    cy.viewport('iphone-6');
    cy.clearLocalStorage();
    stubWeather();
  });

  it('persists sound settings and completes a classic game through results', () => {
    cy.visit('/');
    cy.contains('Enter App').click();

    cy.get(byLabel('Settings')).first().click();
    cy.get(byLabel('Sound Effects')).should('be.checked').click();
    cy.get(byLabel('Sound Effects')).should('not.be.checked');
    cy.window().then((win) => {
      const storedValues = [
        win.localStorage.getItem('@weathr_sound_effects'),
        win.localStorage.getItem('AsyncStorage:@weathr_sound_effects'),
      ];
      expect(storedValues).to.include('false');
    });
    cy.get(byLabel('Back')).click();

    cy.get(byLabel('Practice')).click();
    cy.get(byLabel('What is the current temperature?'), { timeout: 30000 }).should('be.visible');
    cy.wait('@weather');

    cy.get(byLabel('What is the current temperature?')).click().should('have.focus');
    cy.get(byLabel('Add minus')).click();
    cy.get(byLabel('What is the current temperature?')).should('have.value', '-').and('have.focus');
    cy.get(byLabel('Remove minus')).click();
    cy.get(byLabel('What is the current temperature?')).should('have.value', '').and('have.focus');

    for (let round = 1; round <= 10; round += 1) {
      // Stubbed live temperature is 20°C; one round is deliberately 3° off.
      cy.get(byLabel('What is the current temperature?')).click().type(round === 5 ? '23' : '20');
      cy.get(byLabel('Submit Guess')).should('not.be.disabled').click();
      cy.get('[data-testid="degrees-off"]').should('contain', round === 5 ? '3°C off' : 'Spot on!');
      cy.get('[data-testid="next-city-button"]').click();
      if (round < 10) {
        cy.get(byLabel('What is the current temperature?')).should('have.value', '');
      }
    }

    cy.contains('Round Complete!').should('be.visible');
    cy.contains('Average off').should('be.visible');
    cy.contains('0.3°C').should('be.visible');
    cy.contains('Exit to Home').should('be.visible');
  });
});
