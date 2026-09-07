#!/usr/bin/env bash
#
# Constitue un echantillon de produits de soin visage depuis Open Beauty Facts,
# pour alimenter scripts/audit-coverage.ts.
#
# La donnee Open Beauty Facts est sous licence ODbL : elle n'est pas versionnee
# dans ce depot, ce script permet de la reconstituer a l'identique.
#
# L'API limite la recherche a une dizaine de requetes par minute, et un
# page_size superieur a 24 declenche ce plafond : d'ou la pause entre appels.
#
# Usage : ./scripts/fetch-sample.sh <repertoire-de-sortie>

set -euo pipefail

OUT="${1:?Usage: fetch-sample.sh <repertoire-de-sortie>}"
mkdir -p "$OUT"

UA="LucyMVP/0.1 (audit de couverture du referentiel)"
FIELDS="code,product_name,brands,ingredients_text,categories_tags"
CATEGORIES=(face-creams day-creams night-creams moisturizers serums face-cleansers)

for category in "${CATEGORIES[@]}"; do
  for page in 1 2 3 4 5; do
    curl -sS -m 60 -A "$UA" \
      "https://world.openbeautyfacts.org/api/v2/search?categories_tags_en=${category}&fields=${FIELDS}&page_size=24&page=${page}" \
      -o "${OUT}/${category}_${page}.json"
    count=$(python3 -c "import json,sys;print(len(json.load(open(sys.argv[1])).get('products',[])))" "${OUT}/${category}_${page}.json" 2>/dev/null || echo 0)
    printf '%-16s page %s : %3s produits\n' "$category" "$page" "$count"
    [ "$count" = "0" ] && break
    sleep 7
  done
done

python3 - "$OUT" <<'PY'
import glob, json, os, sys

out = sys.argv[1]
products = {}
for path in sorted(glob.glob(os.path.join(out, '*_*.json'))):
    if path.endswith('sample.json'):
        continue
    try:
        data = json.load(open(path))
    except Exception:
        continue
    for product in data.get('products', []):
        code = product.get('code')
        if code:
            products[code] = product

target = os.path.join(out, 'sample.json')
json.dump(list(products.values()), open(target, 'w'), ensure_ascii=False, indent=0)
print(f'\nEchantillon dedoublonne : {len(products)} produits -> {target}')
PY
