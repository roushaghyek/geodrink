const byTestId = (id) => `[data-testid="${id}"]`;

describe('rules and party copy', () => {
  beforeEach(() => {
    cy.viewport('iphone-6');
    cy.clearLocalStorage();
  });

  it('makes forfeits the default and drinking an 18+ opt-in', () => {
    cy.visit('/');
    cy.contains('Enter App').click();
    cy.contains('Rules/Help').click();
    cy.contains('The default penalty is a forfeit card').should('be.visible');
    cy.contains('Drinking rules are optional, for adults only (18+)').should('be.visible');
    cy.contains('Guess wrong? You drink').should('not.exist');

    cy.visit('/party-setup');
    cy.get(byTestId('penalty-mode-forfeits')).should('have.attr', 'aria-checked', 'true');
    cy.get(byTestId('penalty-mode-drinks')).click();
    cy.get(byTestId('age-gate')).should('be.visible');
    cy.get(byTestId('penalty-mode-drinks')).should('have.attr', 'aria-checked', 'false');
    cy.get(byTestId('age-gate-confirm')).click();
    cy.get(byTestId('penalty-mode-drinks')).should('have.attr', 'aria-checked', 'true');
    cy.get(byTestId('drink-responsibly-note')).should('contain', 'Drink responsibly');
  });
});
