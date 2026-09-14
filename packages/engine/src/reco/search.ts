import type { Concern, ProductCategory, SkinProfile, Product } from '../types.ts';
import { parseSearchQuery, type SearchAxis, type SearchQuery } from './query.ts';
import { parseInciList } from '../inci/parse.ts';
import { recommend, type Recommendation, type RecommendOptions } from './recommend.ts';

/**
 * Recherche par criteres.
 *
 * Cette couche existe pour une raison precise : l'application veut offrir un
 * champ de recherche en langage libre, et c'est un modele de langage qui
 * traduira la phrase. Le modele ne choisit pas les produits — il produit un
 * `SearchQuery`, et c'est le moteur de regles qui filtre, classe et justifie.
 *
 * La frontiere est structurante. Un classement produit par un modele n'est ni
 * rejouable ni opposable a une marque, alors que tout le projet consiste a
 * fournir des notes defendables, motif par motif et source par source. Le
 * modele traduit une intention ; il ne porte aucun jugement sur une formule.
 *
 * Corollaire pratique : `SearchQuery` ne contient que des criteres verifiables.
 * Rien n'y est libre, aucune chaine de caractere n'y voyage jusqu'au
 * classement. Une sortie de modele qui ne s'y conforme pas est rejetee plutot
 * qu'interpretee.
 */

/** Axe que l'utilisateur a explicitement mis en avant dans sa demande. */
export type MatchedCriterion =
  | { kind: 'category'; category: ProductCategory }
  | { kind: 'maxIngredients'; requested: number; actual: number }
  | { kind: 'axis'; axis: SearchAxis; score: number }
  | { kind: 'concern'; concern: Concern; score: number }
  | { kind: 'avoidFragrance' };

/** Critere de la demande qu'aucun produit du catalogue ne satisfait. */
export type UnmetCriterion =
  | { kind: 'axis'; axis: SearchAxis; floor: number }
  | { kind: 'maxIngredients'; requested: number }
  | { kind: 'category'; category: ProductCategory }
  | { kind: 'aucun' };

export interface SearchResult extends Recommendation {
  /**
   * Ce que ce produit satisfait de la demande. L'interface l'affiche sous le
   * produit : une reponse a une phrase libre doit montrer ce qu'elle a compris,
   * sinon l'utilisateur ne peut pas distinguer une bonne reponse d'un hasard.
   */
  matched: MatchedCriterion[];
}

export interface SearchOutcome {
  results: SearchResult[];
  /**
   * Criteres que le moteur a du relacher, ou qu'aucun produit ne satisfait.
   * L'interface les annonce : une recherche qui ignore silencieusement la
   * moitie de la demande est pire qu'une recherche vide.
   */
  unmet: UnmetCriterion[];
}

/**
 * Plancher applique a un axe explicitement demande.
 *
 * 70 correspond au bas de la tranche « correcte » de l'echelle. Plus haut, une
 * demande banale ne renvoie plus rien sur un catalogue de taille reelle ; plus
 * bas, le critere ne filtre plus rien et la mention devient mensongere.
 */
export const AXIS_FLOOR = 70;

// Reexportes : la validation et la forme des criteres vivent dans `query.ts`,
// sans dependance d'execution, pour etre appelables depuis le service de
// traduction sans y entrainer le referentiel ni le calcul des scores.
export { parseSearchQuery, type SearchAxis, type SearchQuery };

function toOptions(query: SearchQuery): RecommendOptions {
  const axes = new Set(query.axes ?? []);
  return {
    category: query.category,
    targetConcern: query.targetConcern,
    maxIngredients: query.maxIngredients,
    minSkinScore: axes.has('skin') ? AXIS_FLOOR : undefined,
    minEnvScore: axes.has('env') ? AXIS_FLOOR : undefined,
    excludeInci: query.excludeInci,
    limit: query.limit,
  };
}

/** Faits constates sur ce produit, critere par critere de la demande. */
function criteria(result: Recommendation, query: SearchQuery): MatchedCriterion[] {
  const matched: MatchedCriterion[] = [];
  const { product, assessment } = result;

  if (query.category) matched.push({ kind: 'category', category: query.category });
  if (query.maxIngredients !== undefined) {
    matched.push({
      kind: 'maxIngredients',
      requested: query.maxIngredients,
      actual: parseInciList(product.inciList).length,
    });
  }
  for (const axis of query.axes ?? []) {
    matched.push({
      kind: 'axis',
      axis,
      score: axis === 'skin' ? assessment.skin.value : assessment.env.value,
    });
  }
  if (query.targetConcern) {
    matched.push({
      kind: 'concern',
      concern: query.targetConcern,
      score: assessment.personalized?.value ?? assessment.skin.value,
    });
  }
  if (query.avoidFragrance) matched.push({ kind: 'avoidFragrance' });

  return matched;
}

/**
 * Execute une recherche par criteres sur un catalogue.
 *
 * Le profil est applique par le moteur, ici, sur l'appareil. Il n'a aucune
 * raison de quitter le telephone : le modele de langage n'a besoin que de la
 * phrase, jamais du type de peau ni des intolerances, qui sont des donnees de
 * sante.
 */
export function search(
  catalog: Product[],
  profile: SkinProfile,
  query: SearchQuery,
): SearchOutcome {
  const effective: SkinProfile = query.avoidFragrance
    ? { ...profile, avoidFragrance: true }
    : profile;

  const options = toOptions(query);
  const results = recommend(catalog, effective, options);
  const decorate = (list: Recommendation[]): SearchResult[] =>
    list.map((r) => ({ ...r, matched: criteria(r, query) }));

  if (results.length > 0) return { results: decorate(results), unmet: [] };

  const unmet: UnmetCriterion[] = [];

  // Les axes sont le seul critere que l'on relache : ils expriment une
  // exigence de qualite, pas la nature du produit cherche. Relacher la
  // categorie ou le nombre d'ingredients repondrait a cote de la demande —
  // un nettoyant a qui veut une creme — ce qui est pire qu'une liste vide.
  const relaxed = { ...options, minSkinScore: undefined, minEnvScore: undefined };
  if (query.axes?.length) {
    const withoutAxes = recommend(catalog, effective, relaxed);
    if (withoutAxes.length > 0) {
      for (const axis of query.axes) unmet.push({ kind: 'axis', axis, floor: AXIS_FLOOR });
      return { results: decorate(withoutAxes), unmet };
    }
  }

  // Toujours rien. On ne renvoie pas de produit, mais on dit lequel des
  // criteres est en cause : une recherche vide sans explication laisse
  // l'utilisateur reformuler au hasard.
  if (query.maxIngredients !== undefined) {
    const sansLimite = recommend(catalog, effective, { ...relaxed, maxIngredients: undefined });
    if (sansLimite.length > 0) {
      unmet.push({ kind: 'maxIngredients', requested: query.maxIngredients });
    }
  }
  if (query.category && unmet.length === 0) {
    const sansCategorie = recommend(catalog, effective, { ...relaxed, category: undefined });
    if (sansCategorie.length > 0) unmet.push({ kind: 'category', category: query.category });
  }
  if (query.axes?.length && unmet.length === 0) {
    for (const axis of query.axes) unmet.push({ kind: 'axis', axis, floor: AXIS_FLOOR });
  }
  if (unmet.length === 0) unmet.push({ kind: 'aucun' });

  return { results: [], unmet };
}
