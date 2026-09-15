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

const mistral = new Mistral({
  apiKey: Deno.env.get('MISTRAL_API_KEY') ?? '',
  // La demande porte desormais un profil de peau : le point d'entree europeen
  // n'est plus un confort, c'est ce qui evite un transfert a justifier.
  server: (Deno.env.get('LUCY_MISTRAL_REGION') ?? 'eu') as 'eu' | 'global' | 'us',
});

const base = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve((req: Request) => traiter(req, { mistral, base }));
