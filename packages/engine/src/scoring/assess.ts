import type {
  ParsedIngredient,
  Product,
  ProductAssessment,
  ScoreResult,
  SkinProfile,
} from '../types.ts';
import { parseInciList } from '../inci/parse.ts';
import { resolveAll } from '../inci/resolve.ts';
import { estimateConcentrations } from '../concentration/estimate.ts';
import { scoreSkin } from './skin.ts';
import { scoreEnv } from './env.ts';
import { formatRange } from './dose.ts';

/**
 * Evaluation complete d'un produit : parsing, estimation des concentrations,
 * puis les deux scores independants et leur declinaison personnalisee.
 */

/** Penalite appliquee quand l'utilisateur souhaite eviter tout parfum. */
const FRAGRANCE_AVOIDANCE_PENALTY = 30;

/** Les ingredients non toleres declares par l'utilisateur, presents dans la formule. */
function findBlockers(parsed: ParsedIngredient[], profile: SkinProfile): string[] {
  const avoided = new Set(profile.notTolerated.map((i) => i.toLowerCase().trim()));
  if (avoided.size === 0) return [];

  const found = new Set<string>();
  for (const item of parsed) {
    if (avoided.has(item.normalized)) found.add(item.normalized);
    if (item.ingredient && avoided.has(item.ingredient.inci)) found.add(item.ingredient.inci);
  }
  return [...found];
}

/**
 * Applique les preferences declarees qui ne relevent pas d'une donnee
 * d'ingredient mais d'un choix de l'utilisateur.
 */
function applyPreferences(
  score: ScoreResult,
  parsed: ParsedIngredient[],
  profile: SkinProfile,
): ScoreResult {
  if (!profile.avoidFragrance) return score;

  const fragrance = parsed.find(
    (item) =>
      item.ingredient?.functions.includes('fragrance') ||
      item.ingredient?.skin?.allergen === 'declarable_fragrance',
  );
  if (!fragrance?.ingredient) return score;

  return {
    ...score,
    value: Math.max(0, score.value - FRAGRANCE_AVOIDANCE_PENALTY),
    reasons: [
      {
        inci: fragrance.ingredient.inci,
        impact: -FRAGRANCE_AVOIDANCE_PENALTY,
        label: 'Vous avez choisi d\'eviter les produits parfumes',
        concentration: { min: 0, max: 0 },
        confidence: 'high',
        sources: ['Preference declaree dans votre profil'],
      },
      ...score.reasons,
    ],
  };
}

/**
 * Evalue un produit, avec ou sans profil utilisateur.
 *
 * Sans profil, `personalized` vaut null et les scores refletent une tolerance
 * moyenne. Avec profil, les effets propres a un type de peau sont soit
 * retenus a plein poids, soit ecartes, et seuls les actifs repondant aux
 * preoccupations declarees rapportent des points.
 */
export function assessProduct(
  product: Product,
  profile?: SkinProfile,
): ProductAssessment {
  const parsed = resolveAll(parseInciList(product.inciList));
  const concentrations = estimateConcentrations(
    parsed,
    product.category,
    product.claims ?? [],
  );

  const skin = scoreSkin(parsed, concentrations);
  const env = scoreEnv(parsed, concentrations);

  if (!profile) {
    return { skin, env, personalized: null, blockers: [], concentrations };
  }

  const blockers = findBlockers(parsed, profile);
  let personalized = applyPreferences(
    scoreSkin(parsed, concentrations, { profile }),
    parsed,
    profile,
  );

  // Un ingredient que l'utilisateur ne tolere pas rend le produit
  // inadapte, quelle que soit la qualite du reste de la formule.
  if (blockers.length > 0) {
    personalized = {
      ...personalized,
      value: 0,
      reasons: [
        ...blockers.map((inci) => ({
          inci,
          impact: -100,
          label: 'Vous avez declare ne pas tolerer cet ingredient',
          concentration: { min: 0, max: 0 },
          confidence: 'high' as const,
          sources: ['Profil utilisateur'],
        })),
        ...personalized.reasons,
      ],
    };
  }

  return { skin, env, personalized, blockers, concentrations };
}

/**
 * Resume textuel du poste le plus penalisant, pour l'affichage compact d'une
 * fiche produit ou d'une carte de resultat.
 */
export function summarize(assessment: ProductAssessment): string {
  if (assessment.blockers.length > 0) {
    return `Contient ${assessment.blockers.join(', ')}, que vous ne tolerez pas`;
  }
  const worst = (assessment.personalized ?? assessment.skin).reasons.find(
    (r) => r.impact < 0,
  );
  if (!worst) return 'Aucun point de vigilance identifie sur cette formule';
  return `${worst.inci} : ${worst.label}`;
}

export { formatRange };
