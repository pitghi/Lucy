import { light, type Palette } from './tokens';

/**
 * Presentation des scores.
 *
 * Deux principes non negociables, qui decoulent directement de ce que Lucy
 * corrige chez les notations existantes :
 *
 * 1. **Pas de feu tricolore.** L'echelle n'emploie pas le vert : « vert = bon »
 *    est la semantique des applications concurrentes et importerait leur
 *    simplification. Le registre va du teal soutenu a l'ambre puis au rouge
 *    brique.
 *
 * 2. **Jamais la couleur seule.** Chaque score porte un libelle textuel propre
 *    a son axe. Un utilisateur daltonien, un lecteur d'ecran ou une capture en
 *    niveaux de gris doivent lire la meme information (regle `color-not-only`).
 */

/** Les trois axes d'evaluation, jamais moyennes entre eux. */
export type ScoreAxis = 'tolerance' | 'environment' | 'fit';

/** Niveau atteint sur un axe. */
export type ScoreLevel = 'high' | 'good' | 'moderate' | 'low';

/**
 * Seuils de niveau, communs aux trois axes pour que l'utilisateur n'ait pas a
 * apprendre une echelle par axe.
 */
const THRESHOLDS: Array<{ min: number; level: ScoreLevel }> = [
  { min: 80, level: 'high' },
  { min: 60, level: 'good' },
  { min: 40, level: 'moderate' },
  { min: 0, level: 'low' },
];

export function levelOf(value: number): ScoreLevel {
  for (const threshold of THRESHOLDS) {
    if (value >= threshold.min) return threshold.level;
  }
  return 'low';
}

/**
 * Libelles par axe.
 *
 * L'axe environnement s'inverse : un score élevé y signifie un impact faible.
 * Nommer les niveaux par axe plutot que par une echelle abstraite evite ce
 * contresens, que produirait un « bon / moyen / mauvais » generique.
 */
const LABELS: Record<ScoreAxis, Record<ScoreLevel, string>> = {
  tolerance: {
    high: 'Très bien tolérée',
    good: 'Bien tolérée',
    moderate: 'Tolérance moyenne',
    low: 'Faible tolérance',
  },
  environment: {
    high: 'Impact faible',
    good: 'Impact modéré',
    moderate: 'Impact notable',
    low: 'Impact élevé',
  },
  fit: {
    high: 'Très adapté à votre profil',
    good: 'Adapté à votre profil',
    moderate: 'Moyennement adapté',
    low: 'Peu adapté à votre profil',
  },
};

/** Intitule de l'axe, tel qu'affiche au-dessus de chaque score. */
export const AXIS_TITLES: Record<ScoreAxis, string> = {
  tolerance: 'Tolérance cutanée',
  environment: 'Environnement',
  fit: 'Adéquation à votre profil',
};

/**
 * Intitules courts, pour les affichages contraints comme les pilules de la
 * liste de recommandations : « Adéquation à votre profil » y depassait la
 * largeur disponible et se coupait en plein mot.
 */
export const AXIS_TITLES_SHORT: Record<ScoreAxis, string> = {
  tolerance: 'Peau',
  environment: 'Environnement',
  fit: 'Profil',
};

/**
 * Ce que chaque axe mesure, en une phrase. Affiche sous l'intitule : un score
 * dont on ignore la question a laquelle il repond n'informe sur rien.
 */
export const AXIS_QUESTIONS: Record<ScoreAxis, string> = {
  tolerance: "Risque d'irritation ou de sensibilisation de cette formule",
  environment: 'Impact de cette formule sur les milieux aquatiques',
  fit: 'Correspondance avec votre type de peau et vos besoins',
};

/**
 * Couleurs par niveau. La progression est aussi une progression de luminosite,
 * de sorte que les niveaux restent distinguables sans percevoir la teinte.
 */
const TONES: Record<ScoreLevel, { color: string; soft: string }> = {
  high: { color: '#0E7490', soft: '#ECFEFF' },
  good: { color: '#0891B2', soft: '#F0FBFF' },
  moderate: { color: '#B54708', soft: '#FFFAEB' },
  low: { color: '#B42318', soft: '#FEF3F2' },
};

/**
 * Variantes sombres.
 *
 * Le mode sombre n'inverse pas les couleurs claires : il emploie des tons plus
 * clairs et moins saturés, seuls à conserver un contraste suffisant sur une
 * surface sombre (règle `color-dark-mode`). Le teal foncé du mode clair y
 * deviendrait illisible.
 */
const TONES_DARK: Record<ScoreLevel, { color: string; soft: string }> = {
  high: { color: '#22D3EE', soft: '#0E2E38' },
  good: { color: '#67E8F9', soft: '#0C2A33' },
  moderate: { color: '#FEC84B', soft: '#33260C' },
  low: { color: '#FDA29B', soft: '#37201E' },
};

/**
 * Icones Lucide associees a chaque niveau. Elles doublent le libelle pour les
 * lectures rapides, sans jamais s'y substituer.
 */
const ICONS: Record<ScoreLevel, string> = {
  high: 'shield-check',
  good: 'shield',
  moderate: 'alert-triangle',
  low: 'alert-octagon',
};

export interface ScorePresentation {
  level: ScoreLevel;
  /** Libelle textuel, toujours affiche a cote de la valeur. */
  label: string;
  /** Intitule de l'axe. */
  title: string;
  /** Question a laquelle l'axe repond. */
  question: string;
  color: string;
  soft: string;
  icon: string;
  /** Enonce complet destine aux lecteurs d'ecran. */
  accessibilityLabel: string;
}

/** Compose tout ce qui est nécessaire pour afficher un score sur un axe. */
export function presentScore(
  axis: ScoreAxis,
  value: number,
  /** true pour obtenir les tons adaptés à une surface sombre. */
  dark = false,
): ScorePresentation {
  const level = levelOf(value);
  const label = LABELS[axis][level];
  const tone = dark ? TONES_DARK[level] : TONES[level];
  return {
    level,
    label,
    title: AXIS_TITLES[axis],
    question: AXIS_QUESTIONS[axis],
    color: tone.color,
    soft: tone.soft,
    icon: ICONS[level],
    accessibilityLabel: `${AXIS_TITLES[axis]} : ${value} sur 100, ${label}`,
  };
}

/** Libelles des niveaux de confiance d'une estimation. */
export const CONFIDENCE_LABELS = {
  high: 'confiance élevée',
  medium: 'confiance moyenne',
  low: 'confiance faible',
} as const;

/**
 * Rendu d'un niveau de confiance.
 *
 * La confiance n'emprunte pas l'echelle des scores : une estimation peu sure
 * n'est pas un mauvais resultat, c'est une information moins precise. Elle
 * s'exprime donc en gris, par la seule intensite du texte, pour ne pas se
 * lire comme un jugement sur le produit.
 */
export function presentConfidence(
  confidence: 'high' | 'medium' | 'low',
  palette: Palette = light,
): { label: string; color: string; dots: number } {
  const dots = confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1;
  return {
    label: CONFIDENCE_LABELS[confidence],
    color: confidence === 'low' ? palette.textSubtle : palette.textMuted,
    dots,
  };
}

/**
 * Seuil de couverture du referentiel en dessous duquel l'ecran annonce une
 * analyse partielle plutot qu'un score. Afficher une note calculee sur la
 * moitie d'une formule serait une precision empruntee.
 */
export const MIN_COVERAGE_TO_SCORE = 0.7;
