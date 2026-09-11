import type { Product, SkinProfile } from '../types.ts';
import { parseInciList } from '../inci/parse.ts';

/**
 * Lecture du journal de tolerance.
 *
 * Ce que le journal permet, et ce qu'il ne permet pas, tient en une phrase :
 * **un produit juge non convenable n'est plus propose, mais aucun ingredient
 * n'est condamne pour autant.** Un produit porte quinze ingredients ; un seul
 * retour negatif ne dit pas lequel a pose probleme, et en penaliser un
 * reviendrait a inventer une cause.
 *
 * Ce module se contente donc de deux choses :
 *
 *  - ecarter des propositions ce que l'utilisateur a deja rejete ;
 *  - **suggerer** une intolerance quand un ingredient revient dans plusieurs
 *    produits rejetes et dans aucun produit accepte. La suggestion est
 *    presentee a l'utilisateur, qui tranche. Elle n'est jamais appliquee
 *    d'office : une correlation sur trois produits n'est pas une cause, et le
 *    projet n'a pas le droit de penaliser une formule sur cette base.
 *
 * La recalibration serieuse des seuils par ingredient viendra du volume,
 * agrege sur de nombreux utilisateurs. C'est le sens de la collecte des le
 * MVP, meme sans exploitation immediate.
 */

/** Codes-barres des produits que l'utilisateur a juges non convenables. */
export function rejectedBarcodes(profile: SkinProfile): Set<string> {
  return new Set(
    (profile.journal ?? [])
      .filter((entry) => entry.verdict === 'unsuited' && entry.barcode)
      .map((entry) => entry.barcode as string),
  );
}

export interface IntoleranceSuggestion {
  /** INCI normalise, tel qu'il serait ajoute aux intolerances. */
  inci: string;
  /** Nombre de produits rejetes qui le contiennent. */
  inRejected: number;
  /** Nombre de produits acceptes qui le contiennent. Toujours 0 ici. */
  inAccepted: number;
  /** Noms des produits rejetes concernes, pour que l'utilisateur reconnaisse. */
  products: string[];
}

/**
 * Nombre de produits rejetes partageant un ingredient avant qu'il vaille la
 * peine d'etre signale.
 *
 * Deux serait trop bavard — deux cremes du marche partagent facilement dix
 * ingredients. Trois reste faible statistiquement, mais il ne s'agit pas de
 * conclure : seulement de poser une question a laquelle l'utilisateur peut
 * repondre par l'experience qu'il a de sa peau.
 */
export const SUGGESTION_THRESHOLD = 3;

/**
 * Ingredients qui ne sont jamais suggeres.
 *
 * L'eau, la glycerine et les conservateurs universels figurent dans presque
 * toutes les formules : ils ressortiraient systematiquement sans rien vouloir
 * dire, et une suggestion evidemment absurde discredite toutes les autres.
 */
const UBIQUITOUS = new Set([
  'aqua',
  'water',
  'glycerin',
  'phenoxyethanol',
  'citric acid',
  'sodium hydroxide',
  'tocopherol',
  'xanthan gum',
]);

/**
 * Propose des intolerances possibles au vu du journal.
 *
 * La sortie est ordonnee du signal le plus net au plus faible. Elle est
 * toujours vide tant que le journal ne contient pas assez de produits rejetes
 * pour que la question ait un sens.
 */
export function suggestIntolerances(
  profile: SkinProfile,
  catalog: Product[],
): IntoleranceSuggestion[] {
  const journal = profile.journal ?? [];
  if (journal.length === 0) return [];

  const byBarcode = new Map(catalog.filter((p) => p.barcode).map((p) => [p.barcode as string, p]));
  const known = new Set(profile.notTolerated.map((i) => i.toLowerCase()));

  const resolve = (verdict: string) =>
    journal
      .filter((entry) => entry.verdict === verdict)
      .map((entry) => (entry.barcode ? byBarcode.get(entry.barcode) : undefined))
      .filter((product): product is Product => product !== undefined);

  const rejected = resolve('unsuited');
  const accepted = resolve('suited');
  if (rejected.length < SUGGESTION_THRESHOLD) return [];

  const inAccepted = new Set<string>();
  for (const product of accepted) {
    for (const item of parseInciList(product.inciList)) inAccepted.add(item.normalized);
  }

  const counts = new Map<string, { count: number; products: string[] }>();
  for (const product of rejected) {
    // Un meme ingredient ne compte qu'une fois par produit.
    for (const normalized of new Set(parseInciList(product.inciList).map((i) => i.normalized))) {
      if (UBIQUITOUS.has(normalized) || known.has(normalized)) continue;
      // Un ingredient present dans un produit qui convient n'explique pas un
      // rejet : le retenir serait accuser ce que l'experience disculpe.
      if (inAccepted.has(normalized)) continue;
      const entry = counts.get(normalized) ?? { count: 0, products: [] };
      entry.count += 1;
      entry.products.push(product.name);
      counts.set(normalized, entry);
    }
  }

  return [...counts.entries()]
    .filter(([, entry]) => entry.count >= SUGGESTION_THRESHOLD)
    .map(([inci, entry]) => ({
      inci,
      inRejected: entry.count,
      inAccepted: 0,
      products: entry.products,
    }))
    .sort((a, b) => b.inRejected - a.inRejected || a.inci.localeCompare(b.inci));
}
