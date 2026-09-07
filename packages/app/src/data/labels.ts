import type { Concern } from '@lucy/engine';

/**
 * Libelles des préoccupations, cote interface.
 *
 * Le moteur expose deja ces libelles pour ses explications ; ils sont
 * redeclares ici pour que l'interface reste maitresse de son vocabulaire
 * d'affichage sans dependre du format des chaines du moteur.
 */
export const CONCERN_LABELS: Record<Concern, string> = {
  acne: 'Imperfections',
  redness: 'Rougeurs',
  dryness: 'Sécheresse',
  barrier: 'Barrière cutanée',
  aging: "Signes de l'âge",
  pigmentation: 'Taches pigmentaires',
  dullness: 'Teint terne',
};
