import type {
  ConcentrationEstimate,
  ParsedIngredient,
  ScoreReason,
  ScoreResult,
  SkinProfile,
  SkinType,
} from '../types.ts';
import { CONCERN_LABELS, formatSkinTypes, formatThreshold } from '../i18n/fr.ts';
import {
  CONFIDENCE_WEIGHT,
  EVIDENCE_WEIGHT,
  efficacyFactor,
  formatEstimatedAt,
  midpoint,
  penaltyFactor,
} from './dose.ts';

/**
 * Score peau : tolérance cutanée et efficacité, ponderees par la dose.
 *
 * Volontairement dissocie du score environnement. Un silicone est excellent
 * pour la peau et mediocre pour les milieux aquatiques ; une huile essentielle
 * est biodégradable et allergisante. Moyenner ces deux axes produit une note
 * qui n'informe sur rien, ce qui est le principal defaut des notations
 * generalistes actuelles.
 */

/** Poids d'un point de severite d'irritation. */
const IRRITATION_WEIGHT = 12;

/** Poids d'un point de severite d'effet dégraissant. */
const STRIPPING_WEIGHT = 8;

/**
 * Poids de l'indice comédogène, deliberement faible : les valeurs publiées
 * proviennent de tests sur oreille de lapin des annees 1970, dont la
 * transposition à la peau humaine n'est pas etablie. On ne peut pas les
 * ignorer, on ne doit pas les traiter comme une preuve.
 */
const COMEDOGENIC_WEIGHT = 2.5;

/** Seuil d'indice comédogène en dessous duquel aucune penalite n'est appliquee. */
const COMEDOGENIC_FLOOR = 3;

/** Concentration de référence pour la ponderation de la comedogenicite. */
const COMEDOGENIC_THRESHOLD = 3;

/** Poids d'un allergène de parfum à déclaration obligatoire. */
const FRAGRANCE_ALLERGEN_WEIGHT = 6;

/** Poids d'un sensibilisant de contact reconnu. */
const SENSITIZER_WEIGHT = 14;

/** Poids d'un point de force d'actif. */
const BENEFIT_WEIGHT = 5;

/**
 * Plafond de bonus. Un produit riche en actifs mais mal toléré ne doit pas
 * pouvoir remonter au niveau d'un produit bien formule.
 */
const BENEFIT_CAP = 40;

/**
 * Base du score d'adéquation au profil.
 *
 * Ce score ne part pas de 100 : sinon tout produit simplement bien toléré
 * plafonnerait, et l'echelle ne distinguerait plus un produit inoffensif mais
 * sans interet d'un produit reellement adapté au profil. Partir du milieu de
 * l'echelle laisse les actifs pertinents faire monter la note et les motifs
 * d'intolerance la faire descendre.
 */
const FIT_BASELINE = 60;

/**
 * Plafond de la penalite cumulee du poste parfum.
 *
 * Une liste INCI mentionne « parfum » puis, séparément, les allergènes de
 * parfum à déclaration obligatoire qu'il contient : limonene, linalool,
 * geraniol. Ces substances ne s'ajoutent pas au parfum, elles le composent.
 * Les penaliser une à une revient a compter quatre fois le meme poste, ce qui
 * est precisement le travers des notations par simple presence d'ingrédient.
 * Le poste entier est donc plafonné.
 */
const FRAGRANCE_GROUP_CAP = 22;

/** Majoration du plafond parfum pour une peau declaree sensible. */
const FRAGRANCE_GROUP_CAP_SENSITIVE = 34;

/** Types de peau pour lesquels la comedogenicite est prise en compte. */
const COMEDOGENIC_SENSITIVE_TYPES: SkinType[] = ['oily', 'combination'];

interface SkinScoreOptions {
  /**
   * Profil utilisateur. Absent, le calcul produit un score de tolérance
   * generique ; present, un score d'adéquation au profil.
   */
  profile?: SkinProfile;
}

/**
 * Un effet propre a certains types de peau compte moins dans le score
 * generique du produit, ou l'on ne sait pas a qui il s'adresse.
 */
function conditionalWeight(
  onlyForTypes: SkinType[] | undefined,
  skinType: SkinType | undefined,
): number {
  if (!onlyForTypes) return 1;
  if (!skinType) return 0.5;
  return onlyForTypes.includes(skinType) ? 1 : 0;
}

/**
 * L'ingrédient releve-t-il du poste parfum ?
 *
 * Le mot « parfum » sur une liste INCI designe un mélange, et les allergènes
 * déclarés juste apres en font partie. Ils constituent donc un seul poste,
 * a penaliser une seule fois.
 */
function isFragrancePost(ingredient: NonNullable<ParsedIngredient['ingredient']>): boolean {
  return (
    ingredient.functions.includes('fragrance') ||
    ingredient.skin?.allergen === 'declarable_fragrance'
  );
}

export function scoreSkin(
  parsed: ParsedIngredient[],
  concentrations: ConcentrationEstimate[],
  options: SkinScoreOptions = {},
): ScoreResult {
  const profile = options.profile;
  const skinType = profile?.skinType;
  const tolerated = new Set((profile?.tolerated ?? []).map((i) => i.toLowerCase()));

  const reasons: ScoreReason[] = [];
  let penalties = 0;
  let bonuses = 0;
  let resolved = 0;

  // Le poste parfum est accumule a part pour pouvoir etre plafonné dans son
  // ensemble, puis reintegre au total.
  let fragrancePenalties = 0;
  const fragranceReasons: ScoreReason[] = [];

  for (const [index, item] of parsed.entries()) {
    const ingredient = item.ingredient;
    const estimate = concentrations[index];
    if (!ingredient || !estimate) continue;
    resolved++;

    // L'utilisateur a déclaré bien tolérer cet ingrédient : on n'applique
    // aucune penalite, meme si le referentiel en prevoit une. Le vecu de
    // l'utilisateur prime sur la moyenne statistique.
    const isTolerated = tolerated.has(ingredient.inci);

    const mid = midpoint(estimate);
    const confidenceWeight = CONFIDENCE_WEIGHT[estimate.confidence];
    const skin = ingredient.skin;
    const fragrancePost = isFragrancePost(ingredient);

    const makeReason = (impact: number, label: string, informational = false): ScoreReason => ({
      inci: ingredient.inci,
      impact: Math.round(impact * 10) / 10,
      label,
      concentration: { min: estimate.min, max: estimate.max },
      confidence: estimate.confidence,
      sources: ingredient.sources,
      ...(informational ? { informational: true } : {}),
    });

    /** Enregistre une penalite dans l'accumulateur qui convient. */
    const addPenalty = (impact: number, label: string) => {
      if (impact <= 0) return;
      if (fragrancePost) {
        fragrancePenalties += impact;
        if (impact >= 0.5) fragranceReasons.push(makeReason(-impact, label));
      } else {
        penalties += impact;
        if (impact >= 0.5) reasons.push(makeReason(-impact, label));
      }
    };

    if (skin && !isTolerated) {
      // --- Irritation -------------------------------------------------------
      if (skin.irritation) {
        const { severity, threshold, onlyForTypes } = skin.irritation;
        const weight = conditionalWeight(onlyForTypes, skinType);
        const dose = penaltyFactor(mid, threshold);
        const impact = severity * IRRITATION_WEIGHT * dose * weight * confidenceWeight;
        const scope = onlyForTypes ? ` (peaux ${formatSkinTypes(onlyForTypes)})` : '';
        addPenalty(
          impact,
          `Potentiel irritant à partir de ${formatThreshold(threshold)} %${scope} ; ${formatEstimatedAt(estimate)}`,
        );
      }

      // --- Effet dégraissant ------------------------------------------------
      if (skin.stripping) {
        const { severity, threshold, onlyForTypes } = skin.stripping;
        const weight = conditionalWeight(onlyForTypes, skinType);
        const dose = penaltyFactor(mid, threshold);
        const impact = severity * STRIPPING_WEIGHT * dose * weight * confidenceWeight;
        addPenalty(
          impact,
          `Effet dégraissant à partir de ${formatThreshold(threshold)} % ; ${formatEstimatedAt(estimate)}`,
        );
      }

      // --- Comedogenicite ---------------------------------------------------
      if (skin.comedogenic !== undefined && skin.comedogenic >= COMEDOGENIC_FLOOR) {
        const relevant = !skinType || COMEDOGENIC_SENSITIVE_TYPES.includes(skinType);
        if (relevant) {
          const dose = penaltyFactor(mid, COMEDOGENIC_THRESHOLD);
          const weight = skinType ? 1 : 0.5;
          const impact =
            skin.comedogenic * COMEDOGENIC_WEIGHT * dose * weight * confidenceWeight;
          addPenalty(
            impact,
            `Indice comédogène ${skin.comedogenic}/5 (donnée de faible robustesse) ; ${formatEstimatedAt(estimate)}`,
          );
        }
      }

      // --- Allergènes -------------------------------------------------------
      if (skin.allergen) {
        const isSensitizer = skin.allergen === 'known_sensitizer';
        const baseWeight = isSensitizer ? SENSITIZER_WEIGHT : FRAGRANCE_ALLERGEN_WEIGHT;
        // Un allergène agit à très faible dose : le seuil de référence est
        // celui de là déclaration obligatoire, pas une dose d'usage.
        const dose = penaltyFactor(mid, isSensitizer ? 0.01 : 0.05);
        const sensitiveBoost = skinType === 'sensitive' ? 1.5 : 1;
        const impact = baseWeight * dose * sensitiveBoost * confidenceWeight;
        addPenalty(
          impact,
          isSensitizer
            ? `Sensibilisant de contact reconnu ; ${formatEstimatedAt(estimate)}`
            : `Allergène de parfum à déclaration obligatoire ; ${formatEstimatedAt(estimate)}`,
        );
      }
    }

    // --- Benefices ----------------------------------------------------------
    for (const benefit of skin?.benefits ?? []) {
      // Avec un profil, seuls les benefices repondant aux préoccupations
      // declarees comptent : un actif dépigmentant n'apporte rien a qui ne
      // cherche pas a traiter des taches.
      if (profile && !profile.concerns.includes(benefit.concern)) continue;

      const efficacy = efficacyFactor(estimate, benefit.minEffective);
      if (efficacy <= 0) continue;

      const impact =
        benefit.strength * BENEFIT_WEIGHT * efficacy * EVIDENCE_WEIGHT[benefit.evidence];
      if (impact < 0.5) continue;

      const label =
        `Actif efficace dès ${formatThreshold(benefit.minEffective)} % sur ` +
        `${CONCERN_LABELS[benefit.concern]} ; ${formatEstimatedAt(estimate)}`;

      if (profile) {
        bonuses += impact;
        reasons.push(makeReason(impact, label));
      } else {
        // Hors profil, le score mesure la tolérance : la presence d'un actif
        // efficace est signalee mais ne remonte pas une note de tolérance.
        reasons.push(makeReason(impact, label, true));
      }
    }
  }

  // --- Plafonnement du poste parfum -----------------------------------------
  // Les impacts affiches sont mis à la meme echelle que la penalite retenue,
  // pour que l'utilisateur puisse retrouver le calcul à partir des lignes
  // qu'on lui montre.
  const fragranceCap =
    skinType === 'sensitive' ? FRAGRANCE_GROUP_CAP_SENSITIVE : FRAGRANCE_GROUP_CAP;
  const cappedFragrance = Math.min(fragrancePenalties, fragranceCap);
  if (fragrancePenalties > 0) {
    const scale = cappedFragrance / fragrancePenalties;
    for (const reason of fragranceReasons) {
      reasons.push({ ...reason, impact: Math.round(reason.impact * scale * 10) / 10 });
    }
  }
  penalties += cappedFragrance;

  const cappedBonus = Math.min(bonuses, BENEFIT_CAP);
  const baseline = profile ? FIT_BASELINE : 100;
  const value = Math.max(0, Math.min(100, baseline - penalties + cappedBonus));

  // Les lignes informatives passent apres celles qui pesent sur la note.
  reasons.sort((a, b) => {
    if (!!a.informational !== !!b.informational) return a.informational ? 1 : -1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  return {
    value: Math.round(value),
    reasons: reasons.filter((r) => Math.abs(r.impact) >= 0.5),
    coverage: parsed.length > 0 ? resolved / parsed.length : 0,
  };
}
