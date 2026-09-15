import { Mistral } from 'npm:@mistralai/mistralai@2.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { traiter } from './traduction.ts';

/**
 * Point d'entree de la fonction.
 *
 * Il ne fait qu'instancier ce que le traitement appelle a l'exterieur, et le
 * lui passer. Toute la logique est dans `traduction.ts`, ou elle s'eprouve
 * sans demarrer de serveur ni joindre le modele.
 */

const mistral = new Mistral({
  apiKey: Deno.env.get('MISTRAL_API_KEY') ?? '',
  // La phrase de recherche peut reveler une condition cutanee : la traiter
  // dans l'Union evite d'avoir a justifier un transfert qui n'apporte rien.
  server: (Deno.env.get('LUCY_MISTRAL_REGION') ?? 'eu') as 'eu' | 'global' | 'us',
});

const base = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  // La cle de service contourne la RLS : la table du compteur est fermee a
  // tout le reste, et personne d'autre que cette fonction n'a de raison de la
  // lire.
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve((req: Request) => traiter(req, { mistral, base }));
