const byLabel = (label) => `[aria-label="${label}"]`;
const byTestId = (id) => `[data-testid="${id}"]`;

describe('Weathr Daily', () => {
  beforeEach(() => {
    cy.viewport('iphone-6');
    cy.clearLocalStorage();
    const observation = { tempC: 14, observedAt: Date.now(), fetchedAt: Date.now() };
    cy.intercept('GET', '**/e2e-api/weather?**', { statusCode: 200, body: { observation } }).as('weather');
  });

  it('allows one guess per day and shares a spoiler-free result', () => {
    cy.visit('/');
    cy.contains('Enter App').click();
    cy.get(byTestId('daily-button')).click();

    cy.get(byTestId('city-card')).invoke('attr', 'aria-label').then((cityLabel) => {
      cy.get(byLabel('What is the current temperature?')).type('16');
      cy.get(byLabel('Submit Guess')).click();
      cy.get(byTestId('degrees-off')).should('contain', '2°C off');
      cy.get(byTestId('daily-streak')).should('contain', '1');

      cy.window().then((win) => {
        cy.stub(win.navigator.clipboard, 'writeText').as('copy').resolves();
      });
      cy.get(byTestId('daily-share-button')).click();
      cy.get('@copy').should('have.been.calledOnce').then((stub) => {
        const text = stub.getCall(0).args[0];
        expect(text).to.match(/^Weathr Daily #\d+/);
        expect(text).to.contain('within 3°C');
        expect(text).not.to.contain(cityLabel.split(',')[0]);
        expect(text).not.to.contain('14');
      });
    });

    cy.reload();
    cy.get(byTestId('degrees-off')).should('be.visible');
    cy.get(byLabel('What is the current temperature?')).should('not.exist');
  });
});
