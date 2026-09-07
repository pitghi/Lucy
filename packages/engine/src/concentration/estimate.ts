import type {
  BrandClaim,
  Confidence,
  ConcentrationEstimate,
  ParsedIngredient,
  ProductCategory,
} from '../types.ts';
import { normalizeLabel } from '../inci/parse.ts';

/**
 * Estimation des concentrations a partir d'une liste INCI.
 *
 * C'est la piece qui distingue Lucy des notations existantes. Aucune marque
 * ne publie ses dosages, et le reglement CE 1223/2009 n'impose qu'un ordre
 * de poids decroissant, libre en dessous de 1 %. On ne peut donc pas
 * connaitre une concentration exacte — mais on peut l'encadrer, et
 * l'encadrement suffit a savoir si un ingredient est present a une dose qui
 * fait une difference.
 *
 * Quatre contraintes sont combinees :
 *
 *  1. Ordre decroissant impose par le reglement, au-dessus de 1 %.
 *  2. Ancres de seuil : certains ingredients ont une plage d'usage tres
 *     contrainte (phenoxyethanol <= 1 %, EDTA ~0,1 %, tocopherol <= 0,5 %).
 *     Tout ce qui les suit est donc borne par leur propre maximum.
 *  3. Limites reglementaires par categorie de produit (Annexes UE).
 *  4. Bilan de masse : la somme des ingredients fait 100 %, ce qui resserre
 *     surtout la tete de liste.
 *
 * Le resultat est un intervalle assorti d'un niveau de confiance, jamais une
 * valeur unique : l'interface doit afficher l'incertitude, pas la masquer.
 */

/** Plafond legal implicite de la zone « ordre libre » de la liste INCI. */
const FREE_ORDER_THRESHOLD = 1;

/** Nombre maximal de passes de resserrement des bornes. */
const MAX_REFINEMENT_PASSES = 12;

/** En dessous de cet ecart entre deux passes, on considere avoir converge. */
const CONVERGENCE_EPSILON = 0.01;

interface Bounds {
  min: number;
  max: number;
  method: ConcentrationEstimate['method'];
  /** true si l'ingredient n'est pas garanti present (mention « peut contenir »). */
  optional: boolean;
  /** true si l'entree du referentiel a fourni une plage d'usage. */
  known: boolean;
}

/**
 * Abaisse le plafond d'un intervalle en preservant sa coherence.
 *
 * Quand une contrainte externe (position dans la liste, ancre, limite legale)
 * descend sous le plancher issu de la plage d'usage habituelle, ce plancher
 * n'apprend plus rien : l'ingredient est simplement « au plus » le nouveau
 * plafond. Le conserver ferait croire a une concentration connue avec
 * precision, ce qui est exactement l'erreur a eviter.
 */
function capMax(bounds: Bounds, newMax: number, method: ConcentrationEstimate['method']): void {
  // Un dosage revendique par la marque est l'information la plus fiable
  // disponible : aucune contrainte deduite ne le remet en cause.
  if (bounds.method === 'brand_claim') return;
  if (newMax >= bounds.max) return;

  bounds.max = Math.max(0, newMax);

  // Le nouveau plafond rejoint ou passe sous le plancher : ce plancher venait
  // d'une plage d'usage que la contrainte vient d'invalider. Le conserver
  // reviendrait a annoncer une concentration exacte alors que la seule
  // information disponible est un majorant.
  if (bounds.min >= bounds.max) bounds.min = 0;

  if (bounds.method === 'typical_range' || bounds.method === 'unknown') {
    bounds.method = method;
  }
}

function claimFor(
  item: ParsedIngredient,
  claims: BrandClaim[],
): number | undefined {
  for (const claim of claims) {
    if (normalizeLabel(claim.inci) === item.normalized) return claim.percent;
    if (item.ingredient && normalizeLabel(claim.inci) === item.ingredient.inci) {
      return claim.percent;
    }
  }
  return undefined;
}

/** Bornes propres a un ingredient, avant toute propagation. */
function initialBounds(
  item: ParsedIngredient,
  category: ProductCategory,
  claims: BrandClaim[],
): Bounds {
  const optional = item.mayContain === true;
  const claim = claimFor(item, claims);

  if (claim !== undefined) {
    return { min: claim, max: claim, method: 'brand_claim', optional, known: true };
  }

  const ingredient = item.ingredient;
  if (!ingredient) {
    return { min: 0, max: 100, method: 'unknown', optional, known: false };
  }

  const regulatory = ingredient.regulatoryMax?.[category];
  const typical = ingredient.typicalRange;

  let min = typical ? typical[0] : 0;
  let max = typical ? typical[1] : 100;
  let method: ConcentrationEstimate['method'] = typical ? 'typical_range' : 'unknown';

  if (regulatory !== undefined && regulatory < max) {
    max = regulatory;
    method = 'regulatory_cap';
    // Une limite legale inferieure a la plage d'usage habituelle rend le
    // plancher issu de cette plage caduc.
    if (min > max) min = 0;
  }

  // Un ingredient non garanti present ne peut pas avoir de plancher.
  if (optional) min = 0;

  return { min, max, method, optional, known: typical !== undefined };
}

/**
 * Position du premier ingredient dont le maximum propre est inferieur ou egal
 * a 1 %. A partir de la, le reglement n'impose plus d'ordre : la monotonie
 * decroissante cesse de s'appliquer, mais le plafond de 1 % se propage.
 */
function findFreeOrderStart(bounds: Bounds[]): number {
  for (let i = 0; i < bounds.length; i++) {
    const b = bounds[i];
    if (b && b.known && b.max <= FREE_ORDER_THRESHOLD) return i;
  }
  return bounds.length;
}

/**
 * Applique l'ordre decroissant impose par le reglement, dans la seule zone ou
 * il vaut. Un maximum se propage vers le bas de la liste, un minimum vers le
 * haut : c'est le mecanisme d'ancrage.
 */
function propagateOrder(bounds: Bounds[], freeOrderStart: number): void {
  const lastOrdered = Math.min(freeOrderStart, bounds.length - 1);

  for (let i = 1; i <= lastOrdered; i++) {
    const previous = bounds[i - 1];
    const current = bounds[i];
    if (!previous || !current) continue;
    capMax(current, previous.max, 'anchored');
  }

  for (let i = lastOrdered - 1; i >= 0; i--) {
    const current = bounds[i];
    const next = bounds[i + 1];
    if (!current || !next) continue;
    // Un ingredient ne peut pas etre moins concentre que celui qui le suit.
    if (next.min > current.min) current.min = Math.min(next.min, current.max);
  }
}

/** Propage le plafond de 1 % sur toute la zone « ordre libre ». */
function applyFreeOrderCap(bounds: Bounds[], freeOrderStart: number): void {
  for (let i = freeOrderStart; i < bounds.length; i++) {
    const current = bounds[i];
    if (!current) continue;
    capMax(current, FREE_ORDER_THRESHOLD, 'below_one_percent');
  }
}

/**
 * Bilan de masse : la formule totalise 100 %. Un ingredient ne peut donc pas
 * depasser ce que les planchers des autres laissent disponible, et la tete de
 * liste ne peut pas descendre en dessous de ce que les plafonds des autres
 * laissent a combler.
 *
 * Les ingredients optionnels (« peut contenir ») sont exclus du plancher
 * collectif puisque leur presence n'est pas garantie.
 */
function applyMassBalance(bounds: Bounds[]): void {
  const totalMin = bounds.reduce((sum, b) => sum + (b.optional ? 0 : b.min), 0);
  const totalMax = bounds.reduce((sum, b) => sum + b.max, 0);

  for (const current of bounds) {
    const othersMin = totalMin - (current.optional ? 0 : current.min);
    capMax(current, 100 - othersMin, 'mass_balance');

    const othersMax = totalMax - current.max;
    const requiredMin = 100 - othersMax;
    if (!current.optional && requiredMin > current.min) {
      current.min = Math.min(requiredMin, current.max);
      if (current.method === 'unknown') current.method = 'mass_balance';
    }
  }
}

/** Niveau de confiance deduit de la methode et de la largeur de l'intervalle. */
function confidenceFor(bounds: Bounds, inFreeOrderZone: boolean): Confidence {
  if (bounds.method === 'brand_claim') return 'high';
  if (!bounds.known) return 'low';

  const width = bounds.max - bounds.min;

  // Dans la zone sous 1 %, l'ordre est libre : on connait un plafond sur, mais
  // la position ne renseigne plus sur la quantite reelle.
  if (inFreeOrderZone) return width <= 0.3 ? 'medium' : 'low';

  if (bounds.method === 'regulatory_cap' && width <= 1) return 'high';
  if (width <= 1) return 'high';
  if (width <= 8) return 'medium';
  return 'low';
}

function totalWidth(bounds: Bounds[]): number {
  return bounds.reduce((sum, b) => sum + (b.max - b.min), 0);
}

/**
 * Estime la concentration de chaque ingredient d'une liste INCI resolue.
 *
 * @param parsed   liste parsee et resolue contre le referentiel
 * @param category categorie du produit, qui determine les limites legales
 * @param claims   dosages revendiques par la marque, s'il y en a
 */
export function estimateConcentrations(
  parsed: ParsedIngredient[],
  category: ProductCategory,
  claims: BrandClaim[] = [],
): ConcentrationEstimate[] {
  if (parsed.length === 0) return [];

  const bounds = parsed.map((item) => initialBounds(item, category, claims));
  const freeOrderStart = findFreeOrderStart(bounds);

  // Les contraintes s'influencent mutuellement : resserrer le plafond de l'eau
  // libere de la marge ailleurs, et inversement. On itere jusqu'a stabilisation.
  let previousWidth = totalWidth(bounds);
  for (let pass = 0; pass < MAX_REFINEMENT_PASSES; pass++) {
    propagateOrder(bounds, freeOrderStart);
    applyFreeOrderCap(bounds, freeOrderStart);
    applyMassBalance(bounds);

    const width = totalWidth(bounds);
    if (Math.abs(previousWidth - width) < CONVERGENCE_EPSILON) break;
    previousWidth = width;
  }

  return bounds.map((b, index) => {
    const item = parsed[index];
    const min = Math.max(0, Math.min(b.min, b.max));
    return {
      position: index,
      inci: item?.ingredient?.inci ?? item?.normalized ?? '',
      min: round(min),
      max: round(Math.max(0, b.max)),
      confidence: confidenceFor(b, index >= freeOrderStart),
      method: b.method,
    };
  });
}

function round(value: number): number {
  if (value >= 10) return Math.round(value * 10) / 10;
  if (value >= 1) return Math.round(value * 100) / 100;
  return Math.round(value * 10000) / 10000;
}
