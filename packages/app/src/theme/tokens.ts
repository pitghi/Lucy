/**
 * Jetons de design Lucy.
 *
 * Palette issue du socle « Healthcare » du design system (design-system/lucy),
 * avec un fond neutralise pour ne pas teinter les surfaces de donnees. La
 * palette « Beauty » rose a ete écartée : elle signale un produit lifestyle
 * quand Lucy vend de la rigueur analytique.
 *
 * Aucun composant ne doit ecrire une couleur en dur : tout passe par ces
 * jetons semantiques, condition pour que le mode sombre reste coherent.
 */

export const light = {
  /** Fond de l'application. */
  background: '#F8FAFC',
  /** Surface des cartes et des feuilles. */
  card: '#FFFFFF',
  /** Surface secondaire, pour les zones de donnees encastrees. */
  surfaceMuted: '#F1F5F9',

  /** Texte principal. Contraste 12,6:1 sur le fond. */
  text: '#0F172A',
  /** Texte secondaire. Contraste 4,8:1 sur le fond. */
  textMuted: '#475569',
  /** Texte tertiaire, reserve aux mentions non essentielles. */
  textSubtle: '#64748B',

  /** Couleur d'accent, actions principales. */
  primary: '#0E7490',
  /** Texte pose sur la couleur d'accent. */
  onPrimary: '#FFFFFF',
  /** Fond teinte pour les zones d'accent legeres. */
  primarySoft: '#ECFEFF',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  /** Action destructrice ou blocage. */
  danger: '#B42318',
  dangerSoft: '#FEF3F2',
  /** Mise en garde. */
  warning: '#B54708',
  warningSoft: '#FFFAEB',

  /** Voile des modales. Opacite suffisante pour isoler le premier plan. */
  scrim: 'rgba(15, 23, 42, 0.55)',
} as const;

export const dark = {
  background: '#0B1220',
  card: '#111C2E',
  surfaceMuted: '#1A2537',

  text: '#F1F5F9',
  textMuted: '#B6C2D2',
  textSubtle: '#94A3B8',

  primary: '#22D3EE',
  onPrimary: '#062E36',
  primarySoft: '#12303A',

  border: '#25344A',
  borderStrong: '#35476180',

  danger: '#FDA29B',
  dangerSoft: '#3A1B18',
  warning: '#FEC84B',
  warningSoft: '#3A2A11',

  scrim: 'rgba(2, 6, 23, 0.7)',
} as const;

export type Palette = typeof light;

/**
 * Echelle d'espacement en multiples de 4, conformement a `spacing-scale`.
 * Les ecrans n'emploient pas d'autres valeurs.
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Familles typographiques.
 *
 * Lora en titrés : registre editorial, au service de la credibilite
 * scientifique, et differenciant face a des concurrents tous en sans-serif
 * geometrique.
 *
 * Inter en corps : l'interface affiche en permanence des concentrations et des
 * intervalles. Ses chiffres tabulaires evitent le decalage de mise en page
 * entre « 0,3 a 1 % » et « 10 % » (regle `number-tabular`).
 */
export const font = {
  heading: 'Lora_600SemiBold',
  headingRegular: 'Lora_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

/**
 * Echelle typographique. Le corps de texte est a 16 pour ne jamais descendre
 * sous le seuil de lisibilite mobile (`readable-font-size`), et les tailles
 * s'adaptent a l'agrandissement systeme.
 */
export const type = {
  display: { fontSize: 30, lineHeight: 38, fontFamily: font.heading },
  title: { fontSize: 22, lineHeight: 29, fontFamily: font.heading },
  subtitle: { fontSize: 18, lineHeight: 26, fontFamily: font.bodySemiBold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: font.body },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontFamily: font.bodyMedium },
  small: { fontSize: 14, lineHeight: 21, fontFamily: font.body },
  smallMedium: { fontSize: 14, lineHeight: 21, fontFamily: font.bodyMedium },
  /** Reserve aux mentions et aux sources. Jamais pour du texte essentiel. */
  caption: { fontSize: 13, lineHeight: 19, fontFamily: font.body },
  label: { fontSize: 13, lineHeight: 18, fontFamily: font.bodySemiBold },
} as const;

/**
 * Elevation. Echelle unique et volontairement courte : deux niveaux suffisent
 * a distinguer une carte d'une feuille modale (`elevation-consistent`).
 */
export const elevation = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sheet: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
} as const;

/**
 * Durees d'animation. Les entrees restent dans la fourchette 150-300 ms et les
 * sorties sont plus courtes, pour que l'interface reste réactive
 * (`duration-timing`, `exit-faster-than-enter`).
 */
export const motion = {
  enter: 240,
  exit: 160,
  micro: 150,
} as const;

/** Surface tactile minimale, conformement a `touch-target-size`. */
export const TOUCH_MIN = 44;
