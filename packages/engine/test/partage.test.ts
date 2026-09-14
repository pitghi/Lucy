import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Les Edge Functions recoivent une copie de la validation des criteres, parce
 * qu'une fonction deployee isolement n'atteint pas forcement un fichier situe
 * hors de son dossier.
 *
 * `parseSearchQuery` reste pourtant la seule regle qui fait foi sur la forme
 * des criteres. Ce test est ce qui empeche la copie de devenir une seconde
 * version : modifier le moteur sans relancer `supabase/sync-moteur.sh` le
 * casse, et la divergence se voit au lieu de s'installer.
 */

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Retire l'en-tete pose par le script, pour ne comparer que le contenu. */
function corps(chemin: string): string {
  const texte = readFileSync(join(racine, chemin), 'utf8');
  const marque = '// par le script. Un test du moteur compare ce fichier a sa source.\n';
  const i = texte.indexOf(marque);
  return i === -1 ? texte : texte.slice(i + marque.length).replace(/^\n/, '');
}

test('la copie partagee de parseSearchQuery n a pas diverge du moteur', () => {
  const source = readFileSync(
    join(racine, 'packages/engine/src/reco/query.ts'),
    'utf8',
    // Cote partage, `types.ts` est voisin et non plus un cran au-dessus :
    // c'est la seule retouche que le script applique.
  ).replace("from '../types.ts'", "from './types.ts'");

  assert.equal(
    corps('supabase/functions/_shared/query.ts'),
    source,
    'Relancer ./supabase/sync-moteur.sh',
  );
});

test('la copie partagee des types n a pas diverge du moteur', () => {
  assert.equal(
    corps('supabase/functions/_shared/types.ts'),
    readFileSync(join(racine, 'packages/engine/src/types.ts'), 'utf8'),
    'Relancer ./supabase/sync-moteur.sh',
  );
});
