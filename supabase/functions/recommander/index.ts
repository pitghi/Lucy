import { Mistral } from 'npm:@mistralai/mistralai@2.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { traiter } from './recommandation.ts';

/**
 * Point d'entree de la recommandation par le modele.
 *
 * Il n'instancie que ce que le traitement appelle a l'exterieur. Toute la
 * logique est dans `recommandation.ts`, ou elle s'eprouve sans demarrer de
 * serveur ni joindre le modele.
 */

/**
 * Cle du modele de recommandation.
 *
 * Separable de celle de la traduction : les deux services n'appellent pas les
 * memes modeles, et l'acces a un modele depend du plan sur lequel la cle est
 * emise. `LUCY_RECO_MISTRAL_KEY` prime, `MISTRAL_API_KEY` sert de repli — ce
 * qui laisse le cas courant, une seule cle pour tout, sans configuration.
 */
const CLE = Deno.env.get('LUCY_RECO_MISTRAL_KEY') || Deno.env.get('MISTRAL_API_KEY') || '';

const mistral = new Mistral({
  apiKey: CLE,
  // La demande porte desormais un profil de peau : le point d'entree europeen
  // n'est plus un confort, c'est ce qui evite un transfert a justifier.
  server: (Deno.env.get('LUCY_MISTRAL_REGION') ?? 'eu') as 'eu' | 'global' | 'us',
});

const base = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve((req: Request) => traiter(req, { mistral, base }));
