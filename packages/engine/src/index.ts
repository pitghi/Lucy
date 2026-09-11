/**
 * Moteur Lucy.
 *
 * Point d'entree unique : `assessProduct` prend un produit et un profil
 * facultatif, et renvoie les concentrations estimees, le score peau, le score
 * environnement et le score personnalise, chacun accompagne de ses raisons
 * sourcees.
 */

export * from './types.ts';
export { parseInciList, normalizeLabel } from './inci/parse.ts';
export { resolveIngredient, resolveAll, coverage } from './inci/resolve.ts';
export { estimateConcentrations } from './concentration/estimate.ts';
export { scoreSkin } from './scoring/skin.ts';
export { scoreEnv } from './scoring/env.ts';
export { assessProduct, summarize } from './scoring/assess.ts';
export { formatRange, midpoint, penaltyFactor, efficacyFactor } from './scoring/dose.ts';
export { ALL_INGREDIENTS } from './data/ingredients.ts';
export { recommend } from './reco/recommend.ts';
export type { Recommendation, RecommendOptions } from './reco/recommend.ts';
export { search, parseSearchQuery, AXIS_FLOOR } from './reco/search.ts';
export { estimateTexture } from './scoring/texture.ts';
export type { TextureEstimate } from './scoring/texture.ts';
export {
  suggestIntolerances,
  rejectedBarcodes,
  SUGGESTION_THRESHOLD,
} from './reco/journal.ts';
export type { IntoleranceSuggestion } from './reco/journal.ts';
export type {
  SearchQuery,
  SearchAxis,
  SearchResult,
  SearchOutcome,
  MatchedCriterion,
  UnmetCriterion,
} from './reco/search.ts';
