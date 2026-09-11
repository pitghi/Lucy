import type { Concern, ProductCategory, SkinProfile, Product } from '../types.ts';
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
export type SearchAxis = 'skin' | 'env';

export interface SearchQuery {
  category?: ProductCategory;
  targetConcern?: Concern;
  /** « au maximum 9 ingredients ». */
  maxIngredients?: number;
  /**
   * Axes cites par l'utilisateur. Chacun devient un plancher a franchir, pas
   * un terme d'une moyenne : les trois scores ne fusionnent jamais.
   */
  axes?: SearchAxis[];
  /** « sans parfum ». */
  avoidFragrance?: boolean;
  /** INCI nommement ecartes dans la demande, en plus de ceux du profil. */
  excludeInci?: string[];
  limit?: number;
}

/**
 * Un critere de la demande, et le fait constate sur ce produit.
 *
 * Volontairement sans libelle : le moteur renvoie des faits, l'interface les
 * formule. C'est elle qui possede son vocabulaire d'affichage, et la langue du
 * projet est le francais accentue — ce qu'un moteur sans dependance ni locale
 * n'a pas a porter.
 */
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

const CATEGORIES: ProductCategory[] = ['leave_on_face', 'rinse_off_face', 'leave_on_body'];
const CONCERNS: Concern[] = [
  'acne',
  'redness',
  'dryness',
  'aging',
  'pigmentation',
  'dullness',
  'barrier',
];
const AXES: SearchAxis[] = ['skin', 'env'];

/** Borne haute du nombre d'ingredients : au-dela, le critere ne filtre rien. */
const MAX_INGREDIENTS_CAP = 100;
/** Borne haute des exclusions nommees, pour ne pas vider le catalogue. */
const MAX_EXCLUSIONS = 20;

function pick<T extends string>(value: unknown, allowed: T[]): T | undefined {
  return typeof value === 'string' && (allowed as string[]).includes(value)
    ? (value as T)
    : undefined;
}

/**
 * Valide une sortie de modele de langage et la ramene a un `SearchQuery`.
 *
 * Tout ce qui n'est pas reconnu est **ecarte en silence, jamais interprete** :
 * une valeur inattendue est plus probablement une hallucination qu'une
 * intention de l'utilisateur, et la deviner reviendrait a laisser le modele
 * influencer le classement par la bande. Un champ ecarte se voit ensuite a
 * l'ecran, puisque l'interface affiche ce qu'elle a compris de la demande.
 *
 * La fonction ne rejette jamais : elle renvoie au pire une requete vide, que
 * l'appelant distingue par `Object.keys(...).length === 0`.
 */
export function parseSearchQuery(raw: unknown): SearchQuery {
  if (typeof raw !== 'object' || raw === null) return {};
  const o = raw as Record<string, unknown>;
  const query: SearchQuery = {};

  const category = pick(o.category, CATEGORIES);
  if (category) query.category = category;

  const concern = pick(o.targetConcern, CONCERNS);
  if (concern) query.targetConcern = concern;

  if (
    typeof o.maxIngredients === 'number' &&
    Number.isInteger(o.maxIngredients) &&
    o.maxIngredients > 0 &&
    o.maxIngredients <= MAX_INGREDIENTS_CAP
  ) {
    query.maxIngredients = o.maxIngredients;
  }

  if (Array.isArray(o.axes)) {
    const axes = [...new Set(o.axes.map((a) => pick(a, AXES)).filter((a) => a !== undefined))];
    if (axes.length > 0) query.axes = axes as SearchAxis[];
  }

  if (o.avoidFragrance === true) query.avoidFragrance = true;

  if (Array.isArray(o.excludeInci)) {
    const list = o.excludeInci
      .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
      .slice(0, MAX_EXCLUSIONS);
    if (list.length > 0) query.excludeInci = list;
  }

  return query;
}

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
