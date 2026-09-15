#!/usr/bin/env bash
#
# Recopie la validation des criteres du moteur vers le dossier partage des
# Edge Functions.
#
# POURQUOI UNE COPIE. `parseSearchQuery` est la seule regle qui fait foi sur la
# forme des criteres, et elle doit rester ecrite une seule fois. Mais une Edge
# Function est deployee isolement : rien ne garantit qu'un import pointant hors
# de `supabase/functions/` survive a l'empaquetage.
#
# La copie est donc **generee, jamais editee**, et un test la compare a sa
# source (`npm test --workspace @lucy/engine`). Modifier le moteur sans
# relancer ce script casse ce test — c'est tout l'interet : la divergence se
# voit, au lieu de s'installer.
#
#   ./supabase/sync-moteur.sh
#
set -euo pipefail

racine="$(cd "$(dirname "$0")/.." && pwd)"
partage="$racine/supabase/functions/_shared"

mkdir -p "$partage"

# `types.ts` accompagne `query.ts` : il n'a lui-meme aucun import et ne contient
# que des types, effaces a l'execution. Le recopier coute donc zero au
# deploiement et evite de redefinir a cote les enumerations qui font foi.
copier() {
  local source="$racine/packages/engine/src/$1"
  local cible="$partage/$(basename "$1")"
  {
    echo "// GENERE PAR supabase/sync-moteur.sh — NE PAS MODIFIER A LA MAIN."
    echo "// Source : packages/engine/src/$1"
    echo "//"
    echo "// Toute modification doit se faire dans le moteur, puis etre recopiee"
    echo "// par le script. Un test du moteur compare ce fichier a sa source."
    echo ""
    cat "$source"
  } > "$cible"
  echo "  ${cible#"$racine"/}"
}

echo "Copies a jour :"
copier reco/query.ts
copier types.ts

# Dans le moteur, `query.ts` vit un cran sous `types.ts` ; cote partage, les
# deux sont voisins. C'est la seule retouche que subit la copie, et le test
# d'integrite la reproduit a l'identique.
sed -i.bak "s|from '../types.ts'|from './types.ts'|" "$partage/query.ts"
rm -f "$partage/query.ts.bak"
