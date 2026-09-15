/**
 * Ce que l'application envoie, et ce que le service rend.
 *
 * **Ce module porte une rupture avec le reste du projet.** Le profil de peau
 * quitte l'appareil : ce sont des donnees de sante au sens du RGPD, et toute
 * l'architecture d'origine existait pour qu'elles n'en sortent pas (1.8). La
 * decision est assumee et consignee ; ce fichier en est la frontiere, et c'est
 * ici qu'on lit exactement ce qui part.
 */

/** Type de peau declare. Les valeurs sont celles du moteur. */
export type TypeDePeau = 'normale' | 'seche' | 'grasse' | 'mixte' | 'sensible';

/**
 * Le profil transmis au modele.
 *
 * Chaque champ est optionnel : l'utilisateur qui n'a rien renseigne obtient une
 * recommandation qui ne repose que sur sa phrase, et rien de le sien ne part.
 */
export interface Profil {
  typeDePeau?: TypeDePeau;
  /** Preoccupations declarees, en clair — « rougeurs », « imperfections ». */
  preoccupations?: string[];
  /** INCI que la personne ne tolere pas. */
  nonToleres?: string[];
  /** INCI qu'elle tolere bien, malgre une reputation contraire. */
  toleres?: string[];
  /** Elle souhaite eviter tout parfum. */
  sansParfum?: boolean;
  /** Produits deja essayes et juges mauvais : a ne pas reproposer. */
  dejaEcartes?: string[];
}

export interface DemandeReco {
  texte: string;
  profil?: Profil;
}

/** Un produit propose par le modele. */
export interface Suggestion {
  nom: string;
  marque: string;
  /** Pourquoi il repond a la demande **et** au profil. */
  pourquoi: string;
  /**
   * Code-barres, si le modele l'a trouve.
   *
   * C'est ce qui vaut le plus : Open Beauty Facts l'indexe, et le scan
   * l'exploite deja. Chercher par le nom est approximatif dans les deux sens —
   * mesure sur dix produits courants, la composition ne sort que quatre fois,
   * et deux de ces quatre sont une autre variante que celle demandee.
   */
  codeBarres?: string;
  /**
   * Liste INCI lue en ligne par le modele, telle quelle.
   *
   * Repli quand le code-barres manque. Moins sure qu'Open Beauty Facts, d'ou
   * `sourceComposition` : une note calculee sur une composition doit pouvoir
   * dire d'ou elle la tient, sinon elle ne se conteste pas.
   */
  inci?: string;
  /** Page d'ou la liste INCI a ete tiree. */
  sourceComposition?: string;
  /** Adresses consultees pour la recommandation elle-meme. */
  sources: string[];
}

/** D'ou vient la composition d'un produit suggere, et ce qu'elle vaut. */
export type ProvenanceComposition =
  /** Open Beauty Facts par code-barres : exact. */
  | 'openbeautyfacts'
  /** Une page lue par le modele : plausible, non verifie. */
  | 'web'
  /** Rien de trouve : le produit ne se note pas, et se signale comme tel. */
  | 'introuvable';

export interface ReponseReco {
  suggestions: Suggestion[];
  /**
   * Ce que le modele n'a pas pu prendre en compte, en clair.
   * Une recommandation qui tait ses angles morts se lit comme un verdict.
   */
  reserves: string[];
}
