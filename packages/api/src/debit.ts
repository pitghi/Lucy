import type { IncomingMessage } from 'node:http';

/**
 * Limitation de debit par adresse IP.
 *
 * Le service porte la cle d'API : sans plafond, une URL publique est une cle
 * du modele ouverte a qui la trouve, et la facture suit. C'est le garde-fou
 * minimal avant d'exposer le point d'entree.
 *
 * Fenetre glissante, en memoire, sans dependance ni base : le service est sans
 * etat, et le rester est ce qui permet de ne faire entrer aucune donnee de
 * sante dans l'infrastructure. La contrepartie est assumee — le compteur est
 * par instance, donc un deploiement a plusieurs instances multiplie le plafond
 * reel d'autant. A une instance, le cas actuel, il est exact.
 */

/** Duree de la fenetre d'observation. */
const FENETRE_MS = 60_000;

/**
 * Nombre de cles suivies au maximum.
 *
 * Sans ce plafond, une adresse differente a chaque appel ferait grossir la
 * table indefiniment : le garde-fou contre le cout deviendrait lui-meme un
 * moyen d'epuiser la memoire du service.
 */
const MAX_CLES = 10_000;

export interface LimiteDebit {
  /** Enregistre un appel et dit s'il reste sous le plafond. */
  autorise(cle: string, maintenant?: number): boolean;
  /** Nombre de cles actuellement suivies. Pour les tests et le diagnostic. */
  readonly taille: number;
}

/**
 * Cree un compteur autorisant `max` appels par fenetre et par cle.
 *
 * Les horodatages sont conserves plutot qu'un simple compteur remis a zero :
 * une fenetre fixe laisserait passer deux fois le plafond a cheval sur sa
 * frontiere, ce qui vide justement le garde-fou de son sens.
 */
export function creerLimiteDebit(max: number, fenetreMs: number = FENETRE_MS): LimiteDebit {
  const appels = new Map<string, number[]>();

  /** Retire les cles dont tous les appels sont sortis de la fenetre. */
  function purger(maintenant: number): void {
    for (const [cle, horodatages] of appels) {
      const dernier = horodatages[horodatages.length - 1];
      if (dernier === undefined || dernier <= maintenant - fenetreMs) appels.delete(cle);
    }
  }

  return {
    get taille() {
      return appels.size;
    },

    autorise(cle: string, maintenant: number = Date.now()): boolean {
      // Un plafond a zero ou negatif fermerait le service sans que personne
      // l'ait demande : une valeur d'environnement absurde desactive la
      // limite plutot que le point d'entree.
      if (!Number.isFinite(max) || max <= 0) return true;

      const debut = maintenant - fenetreMs;
      const horodatages = (appels.get(cle) ?? []).filter((t) => t > debut);

      if (horodatages.length >= max) {
        // La tentative refusee n'est pas enregistree : sinon un client qui
        // insiste repousserait indefiniment sa propre sortie de penalite.
        appels.set(cle, horodatages);
        return false;
      }

      horodatages.push(maintenant);
      appels.set(cle, horodatages);

      if (appels.size > MAX_CLES) {
        purger(maintenant);
        // Si la purge ne suffit pas, la cle la plus anciennement inseree cede
        // sa place. Elle perd son compteur, donc le benefice du doute — c'est
        // le bon sens de l'echec : on n'enferme personne hors du service.
        while (appels.size > MAX_CLES) {
          const plusAncienne = appels.keys().next();
          if (plusAncienne.done) break;
          appels.delete(plusAncienne.value);
        }
      }

      return true;
    },
  };
}

/**
 * Identifie l'appelant pour la limite de debit.
 *
 * `header` n'est lu que s'il est renseigne, et ne doit l'etre qu'avec un
 * en-tete que le proxy **ecrase** — `fly-client-ip` chez Fly. Un en-tete
 * seulement transmis, comme `x-forwarded-for` sur un service joignable en
 * direct, est choisi par l'appelant : la limite se contournerait alors en
 * changeant une ligne de requete. C'est pourquoi le defaut est l'adresse de
 * la connexion, qui elle ne se declare pas.
 */
export function adresseClient(req: IncomingMessage, header: string): string {
  if (header) {
    const brut = req.headers[header];
    const valeur = Array.isArray(brut) ? brut[0] : brut;
    const premiere = valeur?.split(',')[0]?.trim();
    if (premiere) return premiere;
  }
  // Sans adresse identifiable, tous les appels tombent dans le meme seau.
  // C'est volontairement severe : mieux vaut brider le service que laisser un
  // trou par lequel le plafond ne s'applique plus.
  return req.socket?.remoteAddress ?? 'inconnu';
}
