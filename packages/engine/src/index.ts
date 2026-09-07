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
