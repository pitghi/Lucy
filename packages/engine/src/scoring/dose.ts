import type { ConcentrationEstimate } from '../types.ts';
import { formatPercent, formatThreshold } from '../i18n/fr.ts';

/**
 * Ponderation par la dose.
 *
 * C'est le correctif central apporte aux notations existantes : un ingredient
 * n'est pas « bon » ou « mauvais » en soi, il l'est a partir d'une certaine
 * concentration. Un conservateur present a 0,05 % et le meme a 1 % ne
 * meritent pas la meme penalite, et un actif liste en fin d'INCI, donc sous
 * sa dose efficace, ne merite aucun bonus.
 */

/** Concentration representative retenue pour le calcul : milieu de l'intervalle. */
export function midpoint(estimate: ConcentrationEstimate): number {
  return (estimate.min + estimate.max) / 2;
}

/**
 * Facteur de penalite entre 0 et 1, en fonction du rapport a un seuil d'effet.
 *
 * En dessous de la moitie du seuil, l'effet est considere nul. Il croit
 * ensuite lineairement et sature a trois fois le seuil. Cette rampe est
 * volontairement simple et lisible : elle est destinee a etre recalibree
 * ingredient par ingredient a partir des retours de tolerance des
 * utilisateurs, pas a modeliser une courbe dose-reponse.
 */
export function penaltyFactor(concentration: number, threshold: number): number {
  if (threshold <= 0) return 1;
  const ratio = concentration / threshold;
  if (ratio <= 0.5) return 0;
  if (ratio >= 3) return 1;
  return (ratio - 0.5) / 2.5;
}

/**
 * Facteur d'efficacite entre 0 et 1 : quelle part de l'intervalle estime se
 * situe au-dessus de la dose minimale efficace.
 *
 * Un actif dont l'intervalle est entierement sous la dose efficace ne rapporte
 * rien ; un actif dont l'intervalle est entierement au-dessus rapporte tout ;
 * entre les deux, l'incertitude est repercutee sur le bonus.
 */
export function efficacyFactor(
  estimate: ConcentrationEstimate,
  minEffective: number,
): number {
  if (estimate.max < minEffective) return 0;
  if (estimate.min >= minEffective) return 1;
  const width = estimate.max - estimate.min;
  if (width <= 0) return estimate.max >= minEffective ? 1 : 0;
  return (estimate.max - minEffective) / width;
}

/** Ponderation du niveau de preuve applique aux benefices revendiques. */
export const EVIDENCE_WEIGHT = { high: 1, medium: 0.7, low: 0.4 } as const;

/**
 * Ponderation de la confiance de l'estimation de concentration.
 *
 * Une penalite fondee sur une estimation incertaine est atténuée : le moteur
 * ne doit pas sanctionner fermement un produit sur une hypothese fragile.
 */
export const CONFIDENCE_WEIGHT = { high: 1, medium: 0.85, low: 0.6 } as const;

/** Formate un intervalle de concentration pour l'affichage utilisateur. */
export function formatRange(estimate: ConcentrationEstimate): string {
  if (estimate.min === estimate.max) return formatPercent(estimate.max);
  if (estimate.min === 0) return `au plus ${formatPercent(estimate.max)}`;
  return `${formatThreshold(estimate.min)} a ${formatPercent(estimate.max)}`;
}
