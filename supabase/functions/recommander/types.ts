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
  /** Adresse d'ou le modele tient l'information. Vide si la recherche n'en a pas rendu. */
  sources: string[];
}

export interface ReponseReco {
  suggestions: Suggestion[];
  /**
   * Ce que le modele n'a pas pu prendre en compte, en clair.
   * Une recommandation qui tait ses angles morts se lit comme un verdict.
   */
  reserves: string[];
}
