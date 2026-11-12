/**
 * Jetons de design Lucy.
 *
 * Direction artistique « brun, creme, bleu layette » (decision 5.15 du
 * journal) : une toile creme, une encre brune, et un seul bleu, reserve aux
 * actions. Le detail et les ecarts assumes sont dans `design-system/lucy`.
 *
 * Aucun composant ne doit ecrire une couleur en dur : tout passe par ces
 * jetons semantiques, condition pour que le mode sombre reste coherent.
 */

/**
 * Les trois couleurs de l'ADN, telles que fixees par la direction artistique.
 * Les palettes ci-dessous en derivent ; on ne les emploie pas directement dans
 * les ecrans, mais par leur role (`primary`, `text`, `background`...).
 */
export const brand = {
  /** Primary — bleu layette. Aplat des actions principales. */
  primary: '#8EC5FF',
  /** Secondary — brun. Encre du texte, contours, aplats sombres. */
  secondary: '#3B2418',
  /** Tertiary — creme. Toile de fond. */
  tertiary: '#F2E8DA',
} as const;

export const light = {
  /** Fond de l'application : la creme de l'ADN. */
  background: brand.tertiary,
  /** Surface des cartes et des feuilles, un ivoire plus clair que la toile. */
  card: '#FBF7F1',
  /** Surface encastree : zones de donnees, pistes de barres, reperes. */
  surfaceMuted: '#EBDFCE',

  /** Texte principal : l'encre brune. Contraste 11,9:1 sur la toile. */
  text: brand.secondary,
  /** Texte secondaire. Contraste 7,2:1 sur la toile. */
  textMuted: '#5E4636',
  /** Texte tertiaire, reserve aux mentions. 5,2:1 sur la toile, 4,8:1 encastre. */
  textSubtle: '#725B4A',

  /**
   * Bleu layette : aplat des actions principales, indicateur d'onglet actif.
   * Trop clair pour porter du texte sur la toile (1,5:1) : il ne sert jamais
   * de couleur de texte ni de trait — voir `primaryStrong`.
   */
  primary: brand.primary,
  /** Texte et icones poses sur le bleu : l'encre brune, 8:1. */
  onPrimary: brand.secondary,
  /** Bleu dilue : fond des options selectionnees et des pastilles d'etat. */
  primarySoft: '#DCEBFC',
  /**
   * Bleu soutenu, quand le bleu doit se lire : texte, icone, trait de
   * donnees. 6,9:1 sur la toile, 5,7:1 contre la piste d'une barre.
   */
  primaryStrong: '#234F80',

  /** Aplat brun : badges, rang, contour d'une option retenue. */
  secondary: brand.secondary,
  /** Texte pose sur l'aplat brun : la creme. */
  onSecondary: brand.tertiary,

  border: '#E2D3BF',
  /** Contour d'un controle a identifier (case a cocher) : 3,3:1 sur la carte. */
  borderStrong: '#9A846F',

  /** Action destructrice ou blocage. Brique, pas de rouge vif. */
  danger: '#A0381F',
  dangerSoft: '#F8E1D9',
  /** Mise en garde. Ocre, dans la famille du brun. */
  warning: '#85520F',
  warningSoft: '#F7E6C6',

  /** Voile des modales, teinte de l'encre plutot que d'un gris froid. */
  scrim: 'rgba(59, 36, 24, 0.55)',
} as const;

/**
 * Theme sombre : un brun expresso, l'encre devient creme.
 *
 * Il ne s'obtient pas en inversant le theme clair : les contrastes s'y
 * verifient separement (regle `color-dark-mode`). Le bleu layette, lui, ne
 * change pas : sur l'expresso il atteint 10:1 et peut porter du texte.
 */
export const dark = {
  background: '#1C120C',
  card: '#281A12',
  surfaceMuted: '#33241A',

  text: brand.tertiary,
  textMuted: '#D2C1AD',
  textSubtle: '#B09A85',

  primary: brand.primary,
  onPrimary: brand.secondary,
  primarySoft: '#22324A',
  primaryStrong: brand.primary,

  /** L'encre s'inverse : l'aplat « brun » du theme clair devient creme. */
  secondary: brand.tertiary,
  onSecondary: brand.secondary,

  border: '#3D2C21',
  borderStrong: '#7A6553',

  danger: '#F09C88',
  dangerSoft: '#3D2019',
  warning: '#E6B464',
  warningSoft: '#3A2A14',

  scrim: 'rgba(12, 7, 4, 0.72)',
} as const;

export type Palette = { [K in keyof typeof light]: string };

/**
 * Couleurs posees sur l'image de la camera, identiques dans les deux themes :
 * le fond est une photo, pas une surface de l'application.
 */
export const camera = {
  /** Voile hors de la zone de visee, teinte expresso. */
  overlay: 'rgba(28, 18, 12, 0.6)',
  /** Pastille d'instruction. */
  badge: 'rgba(28, 18, 12, 0.8)',
  /** Coins du cadre de visee : le bleu de l'ADN. */
  reticle: brand.primary,
  text: brand.tertiary,
  textMuted: 'rgba(242, 232, 218, 0.78)',
  /** Fond tant que la camera n'a pas d'image. */
  base: '#1C120C',
} as const;

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

/**
 * Rayons. Les cartes restent sobres (14) ; seules les actions et les
 * pastilles sont des gelules, comme dans la reference.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 24,
  pill: 999,
} as const;

/**
 * Familles typographiques.
 *
 * Instrument Serif en titres : un serif editorial a fort contraste, dont
 * l'italique sert d'accent sur un mot (« Pour *vous* »). C'est le registre de
 * la reference, et il garde ce que Lora apportait : une voix editoriale,
 * differenciante face a des concurrents tous en sans-serif geometrique.
 * Il n'existe qu'en graisse 400 : il ne descend donc pas sous 22 px.
 *
 * Inter en corps, inchange : l'interface affiche en permanence des
 * concentrations et des intervalles, et ses chiffres tabulaires evitent le
 * decalage entre « entre 0,3 et 1 % » et « 10 % » (regle `number-tabular`).
 */
export const font = {
  heading: 'InstrumentSerif_400Regular',
  headingItalic: 'InstrumentSerif_400Regular_Italic',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

/**
 * Echelle typographique. Le corps de texte est a 16 pour ne jamais descendre
 * sous le seuil de lisibilite mobile (`readable-font-size`), et les tailles
 * s'adaptent a l'agrandissement systeme.
 *
 * Les tailles de titre sont plus grandes qu'avec Lora : Instrument Serif est
 * etroit, et a 22 px il pese ce que Lora pesait a 18.
 */
export const type = {
  display: { fontSize: 40, lineHeight: 44, fontFamily: font.heading },
  title: { fontSize: 28, lineHeight: 32, fontFamily: font.heading },
  /** Nom de produit dans les listes. */
  titleSmall: { fontSize: 22, lineHeight: 26, fontFamily: font.heading },
  subtitle: { fontSize: 18, lineHeight: 26, fontFamily: font.bodySemiBold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: font.body },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontFamily: font.bodyMedium },
  small: { fontSize: 14, lineHeight: 21, fontFamily: font.body },
  smallMedium: { fontSize: 14, lineHeight: 21, fontFamily: font.bodyMedium },
  /** Reserve aux mentions et aux sources. Jamais pour du texte essentiel. */
  caption: { fontSize: 13, lineHeight: 19, fontFamily: font.body },
  label: { fontSize: 13, lineHeight: 18, fontFamily: font.bodySemiBold },
  /**
   * Surtitre en capitales espacees : marque d'un produit, « Cibler une
   * préoccupation ». La casse vient du style, pas du texte, pour que les
   * lecteurs d'ecran lisent des mots et non des sigles.
   */
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: font.bodySemiBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
} as const;

/**
 * Elevation. Echelle unique et volontairement courte : deux niveaux suffisent
 * a distinguer une carte d'une feuille modale (`elevation-consistent`). Les
 * ombres sont teintees de brun et a peine marquees : dans la reference, ce
 * sont les filets qui separent les surfaces, pas les ombres.
 */
export const elevation = {
  card: {
    shadowColor: brand.secondary,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sheet: {
    shadowColor: brand.secondary,
    shadowOpacity: 0.12,
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
