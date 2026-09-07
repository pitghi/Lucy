import type { Concern, Confidence, IngredientFunction, SkinType } from '../types.ts';

/**
 * Libelles francais destines à l'affichage.
 *
 * Le moteur travaille sur des identifiants stables ; toute chaine vue par
 * l'utilisateur passe par ici. Les explications de score etant le produit
 * lui-meme, elles ne peuvent pas laisser filtrer de vocabulaire technique
 * anglais.
 */

export const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  dry: 'sèche',
  oily: 'grasse',
  combination: 'mixte',
  normal: 'normale',
  sensitive: 'sensible',
};

/**
 * Formes plurielles, requises par les explications de score : celles-ci
 * mentionnent une categorie de peaux (« peaux sensibles »), non la peau d'un
 * utilisateur donne. Accorder au singulier produisait « peaux sensible ».
 */
export const SKIN_TYPE_LABELS_PLURAL: Record<SkinType, string> = {
  dry: 'sèches',
  oily: 'grasses',
  combination: 'mixtes',
  normal: 'normales',
  sensitive: 'sensibles',
};

export const CONCERN_LABELS: Record<Concern, string> = {
  acne: 'imperfections',
  redness: 'rougeurs',
  dryness: 'sécheresse',
  aging: 'signes de l\'âge',
  pigmentation: 'taches pigmentaires',
  dullness: 'teint terne',
  barrier: 'barrière cutanée',
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: 'élevée',
  medium: 'moyenne',
  low: 'faible',
};

export const FUNCTION_LABELS: Record<IngredientFunction, string> = {
  solvent: 'solvant',
  humectant: 'humectant',
  emollient: 'émollient',
  emulsifier: 'émulsifiant',
  surfactant: 'tensioactif',
  preservative: 'conservateur',
  thickener: 'épaississant',
  ph_adjuster: 'ajusteur de pH',
  chelator: 'chélateur',
  antioxidant: 'antioxydant',
  fragrance: 'parfum',
  colorant: 'colorant',
  active: 'actif',
  film_former: 'filmogene',
  uv_filter: 'filtre UV',
};

/**
 * Formate un pourcentage à la francaise, sans notation scientifique.
 *
 * Les concentrations utiles s'etendent de 0,001 % (allergène de parfum) a
 * 90 % (phase aqueuse) : le nombre de decimales s'adapté à l'ordre de
 * grandeur pour rester lisible aux deux extremites.
 */
export function formatPercent(value: number): string {
  if (value === 0) return '0 %';
  if (value >= 10) return `${round(value, 0)} %`;
  if (value >= 1) return `${round(value, 1)} %`;
  if (value >= 0.1) return `${round(value, 2)} %`;
  if (value >= 0.01) return `${round(value, 3)} %`;
  return `${round(value, 4)} %`;
}

/** Formate un seuil de concentration, sans le symbole de pourcentage repete. */
export function formatThreshold(value: number): string {
  return formatPercent(value).replace(' %', '');
}

function round(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  // Retire les zeros de fin sans laisser de separateur orphelin.
  const trimmed = decimals > 0 ? fixed.replace(/\.?0+$/, '') : fixed;
  return trimmed.replace('.', ',');
}

/**
 * Liste des types de peau concernes, au pluriel.
 *
 * Employee dans les explications de score, qui designent une categorie de
 * peaux et non celle d'un utilisateur : « peaux sensibles », pas
 * « peaux sensible ».
 */
export function formatSkinTypes(types: SkinType[]): string {
  return types.map((t) => SKIN_TYPE_LABELS_PLURAL[t]).join(', ');
}
