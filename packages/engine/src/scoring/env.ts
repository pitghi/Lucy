import type {
  ConcentrationEstimate,
  ParsedIngredient,
  ScoreReason,
  ScoreResult,
} from '../types.ts';
import { CONFIDENCE_WEIGHT, formatRange, midpoint } from './dose.ts';

/**
 * Score environnement, calcule independamment du score peau.
 *
 * Ici aussi la dose compte, mais differemment : la ou une irritation cutanee
 * repond a un seuil d'effet, l'impact environnemental est a peu pres
 * proportionnel a la masse rejetee. Un tensioactif persistant a 15 % pese
 * cent fois plus qu'un chelateur a 0,15 %, ce qu'une notation par simple
 * presence de l'ingredient ne traduit pas.
 */

/**
 * Les poids ci-dessous s'expriment en points de penalite par pourcent de la
 * formule. Ils sont volontairement directs, sans coefficient correctif cache :
 * le score environnement doit rester recalculable a la main a partir des
 * lignes affichees a l'utilisateur.
 *
 * CALIBRAGE PROVISOIRE. Ces valeurs produisent une echelle discriminante sur
 * les formules types du marche, mais elles ne sont pas issues d'une analyse de
 * cycle de vie. Elles doivent etre revues avec une competence en ecotoxicologie
 * avant toute publication de notes.
 */

/** Penalite par point de toxicite aquatique, par pourcent de formule. */
const AQUATIC_TOXICITY_WEIGHT = 1;

/** Penalite de faible biodegradabilite, par pourcent de formule. */
const POOR_BIODEGRADABILITY_WEIGHT = 2;

/** Penalite de biodegradabilite moderee, par pourcent de formule. */
const MODERATE_BIODEGRADABILITY_WEIGHT = 0.6;

/** Penalite de persistance ou de bioaccumulation, par pourcent de formule. */
const PERSISTENCE_WEIGHT = 2;

/**
 * Penalite forfaitaire pour la presence d'un microplastique intentionnel.
 * Contrairement aux autres criteres, celui-ci n'est pas proportionne : le
 * rejet est definitif quelle que soit la quantite, et la substance fait
 * l'objet d'une interdiction progressive dans l'Union.
 */
const MICROPLASTIC_FLAT_PENALTY = 25;

/**
 * Masse au-dela de laquelle la penalite d'un ingredient sature. Sans ce
 * plafond, un ingredient present a 60 % ecraserait tout le reste du calcul.
 */
const MASS_SATURATION = 20;

/**
 * Contribution massique effective d'un ingredient, en « pourcents ponderes ».
 * La saturation evite qu'un seul ingredient majoritaire ne monopolise le score.
 */
function massContribution(concentration: number): number {
  return Math.min(concentration, MASS_SATURATION);
}

export function scoreEnv(
  parsed: ParsedIngredient[],
  concentrations: ConcentrationEstimate[],
): ScoreResult {
  const reasons: ScoreReason[] = [];
  let penalties = 0;
  let resolved = 0;

  for (const [index, item] of parsed.entries()) {
    const ingredient = item.ingredient;
    const estimate = concentrations[index];
    if (!ingredient || !estimate) continue;
    resolved++;

    const env = ingredient.env;
    if (!env) continue;

    const mass = massContribution(midpoint(estimate));
    const confidenceWeight = CONFIDENCE_WEIGHT[estimate.confidence];

    const addReason = (impact: number, label: string) => {
      if (Math.abs(impact) < 0.5) return;
      reasons.push({
        inci: ingredient.inci,
        impact: -Math.round(impact * 10) / 10,
        label,
        concentration: { min: estimate.min, max: estimate.max },
        confidence: estimate.confidence,
        sources: ingredient.sources,
      });
    };

    if (env.microplastic) {
      penalties += MICROPLASTIC_FLAT_PENALTY;
      addReason(
        MICROPLASTIC_FLAT_PENALTY,
        'Microplastique intentionnellement ajoute, visé par une interdiction progressive dans l\'Union',
      );
    }

    if (env.aquaticToxicity !== undefined && env.aquaticToxicity > 0) {
      const impact = env.aquaticToxicity * AQUATIC_TOXICITY_WEIGHT * mass * confidenceWeight;
      if (impact > 0) {
        penalties += impact;
        addReason(
          impact,
          `Ecotoxicite aquatique (niveau ${env.aquaticToxicity}/3) ; estime a ${formatRange(estimate)} de la formule`,
        );
      }
    }

    if (env.biodegradability === 'poor' || env.biodegradability === 'moderate') {
      const weight =
        env.biodegradability === 'poor'
          ? POOR_BIODEGRADABILITY_WEIGHT
          : MODERATE_BIODEGRADABILITY_WEIGHT;
      const impact = weight * mass * confidenceWeight;
      if (impact > 0) {
        penalties += impact;
        addReason(
          impact,
          env.biodegradability === 'poor'
            ? `Faiblement biodegradable ; estime a ${formatRange(estimate)} de la formule`
            : `Biodegradabilite moderee ; estime a ${formatRange(estimate)} de la formule`,
        );
      }
    }

    if (env.persistent) {
      const impact = PERSISTENCE_WEIGHT * mass * confidenceWeight;
      if (impact > 0) {
        penalties += impact;
        addReason(
          impact,
          `Substance persistante ou bioaccumulable ; estime a ${formatRange(estimate)} de la formule`,
        );
      }
    }
  }

  reasons.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    value: Math.round(Math.max(0, Math.min(100, 100 - penalties))),
    reasons,
    coverage: parsed.length > 0 ? resolved / parsed.length : 0,
  };
}
