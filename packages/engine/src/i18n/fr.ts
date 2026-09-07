import type { Concern, Confidence, IngredientFunction, SkinType } from '../types.ts';

/**
 * Libelles francais destines a l'affichage.
 *
 * Le moteur travaille sur des identifiants stables ; toute chaine vue par
 * l'utilisateur passe par ici. Les explications de score etant le produit
 * lui-meme, elles ne peuvent pas laisser filtrer de vocabulaire technique
 * anglais.
 */

export const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  dry: 'seche',
  oily: 'grasse',
  combination: 'mixte',
  normal: 'normale',
  sensitive: 'sensible',
};

export const CONCERN_LABELS: Record<Concern, string> = {
  acne: 'imperfections',
  redness: 'rougeurs',
  dryness: 'secheresse',
  aging: 'signes de l\'age',
  pigmentation: 'taches pigmentaires',
  dullness: 'teint terne',
  barrier: 'barriere cutanee',
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: 'elevee',
  medium: 'moyenne',
  low: 'faible',
};

export const FUNCTION_LABELS: Record<IngredientFunction, string> = {
  solvent: 'solvant',
  humectant: 'humectant',
  emollient: 'emollient',
  emulsifier: 'emulsifiant',
  surfactant: 'tensioactif',
  preservative: 'conservateur',
  thickener: 'epaississant',
  ph_adjuster: 'ajusteur de pH',
  chelator: 'chelateur',
  antioxidant: 'antioxydant',
  fragrance: 'parfum',
  colorant: 'colorant',
  active: 'actif',
  film_former: 'filmogene',
  uv_filter: 'filtre UV',
};

/**
 * Formate un pourcentage a la francaise, sans notation scientifique.
 *
 * Les concentrations utiles s'etendent de 0,001 % (allergene de parfum) a
 * 90 % (phase aqueuse) : le nombre de decimales s'adapte a l'ordre de
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

/** Liste des types de peau concernes, en francais. */
export function formatSkinTypes(types: SkinType[]): string {
  return types.map((t) => SKIN_TYPE_LABELS[t]).join(', ');
}
