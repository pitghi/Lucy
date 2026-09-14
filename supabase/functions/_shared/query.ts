// GENERE PAR supabase/sync-moteur.sh — NE PAS MODIFIER A LA MAIN.
// Source : packages/engine/src/reco/query.ts
//
// Toute modification doit se faire dans le moteur, puis etre recopiee
// par le script. Un test du moteur compare ce fichier a sa source.

import type { Concern, ProductCategory } from './types.ts';

/**
 * Forme des criteres de recherche, et leur validation.
 *
 * Ce module est **sans aucune dependance d'execution** : il n'importe que des
 * types, effaces a la compilation. C'est deliberé — la validation doit pouvoir
 * etre appelee la ou le moteur complet n'a pas sa place, en particulier depuis
 * le service de traduction, sans y entrainer le referentiel d'ingredients ni
 * le calcul des scores.
 *
 * Elle reste ecrite **une seule fois**. Une regle recopiee a cote du modele
 * finirait par diverger de celle que l'application applique, et c'est
 * exactement ce que cette validation existe pour empecher.
 */

export type SearchAxis = 'skin' | 'env';

export interface SearchQuery {
  category?: ProductCategory;
  targetConcern?: Concern;
  maxIngredients?: number;
  axes?: SearchAxis[];
  avoidFragrance?: boolean;
  excludeInci?: string[];
  limit?: number;
}

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
