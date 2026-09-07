# Lucy — contexte projet

Application d'evaluation et de recommandation de produits cosmetiques de soin
visage, fondee sur l'estimation de la **concentration** des ingredients.

## Lire en premier

- [`docs/decisions.md`](docs/decisions.md) — **le journal des decisions**.
  Ce qui a ete tranche, pourquoi, ce qui a ete ecarte, et ce qui reste ouvert.
  A consulter avant de proposer un changement de conception : la plupart des
  alternatives evidentes y ont deja ete examinees et rejetees pour une raison.
- [`docs/methodologie.md`](docs/methodologie.md) — le modele de notation en
  detail. Ecrit pour etre publie et opposable.
- [`docs/mvp.md`](docs/mvp.md) — perimetre, etapes, risques.
- [`design-system/lucy/`](design-system/lucy/) — design system et ecarts assumes.

## Ce que le projet corrige

Les notations existantes ont deux defauts structurels, et **tout le projet
consiste a les corriger**. Un changement qui les reintroduit est une
regression, meme s'il simplifie le code ou l'interface :

1. **Elles ignorent le dosage.** Un conservateur a 0,05 % et le meme a 1 %
   recoivent la meme penalite. Un actif saupoudre pour figurer sur l'emballage
   est credite comme s'il etait dose.
2. **Elles melangent tolerance cutanee et impact environnemental** dans une
   note unique, qui n'informe alors sur aucun des deux.

## Regles a ne pas casser

- **Trois scores, jamais fusionnes** : tolerance cutanee, environnement,
  adequation au profil. Aucune moyenne, a aucun endroit.
- **Aucune penalite sans passer par la concentration estimee** et son seuil
  d'effet. Un ingredient a l'etat de trace ne se penalise pas.
- **Un actif sous sa dose efficace ne rapporte aucun point.**
- **L'incertitude reste visible** : une concentration s'affiche « entre 0,3 et
  1 % » ou « sous 1 % », jamais par sa moyenne. Chaque estimation porte son
  niveau de confiance.
- **Jamais la couleur seule** : chaque score porte un libelle textuel. Et pas
  de vert dans l'echelle — c'est la semantique des concurrents.
- **Chaque motif porte ses sources.** Une note sans motif ne se distingue pas
  d'un avis, et une marque doit pouvoir contester le calcul sur des faits.
- **Le poste parfum est plafonne** : les allergenes declares composent le
  parfum, ils ne s'y ajoutent pas. Les compter separement penalise une marque
  parce qu'elle est transparente.
- **Les noms INCI restent en denomination internationale**, sans accent. Tout
  le reste de l'interface est en francais **accentue**.

## Commandes

```bash
npm install                                   # racine du monorepo

npm test        --workspace @lucy/engine      # 60 tests
npm run typecheck --workspace @lucy/engine
npm run demo    --workspace @lucy/engine      # moteur en action sur des formules types

npm run ios     --workspace @lucy/app         # simulateur iOS (macOS requis)
npm run android --workspace @lucy/app
npm run web     --workspace @lucy/app         # apercu rapide en navigateur

# Audit de couverture du referentiel sur des produits reels
./packages/engine/scripts/fetch-sample.sh /tmp/lucy-sample
node --experimental-strip-types \
  packages/engine/scripts/audit-coverage.ts /tmp/lucy-sample/sample.json
```

## Structure

```
packages/engine/   moteur pur TypeScript, sans dependance
  src/inci/        parsing et resolution des listes INCI
  src/concentration/  estimation par ancrage
  src/scoring/     les trois scores
  src/reco/        recommandation par regles
  src/data/        referentiel de 185 ingredients, chacun source
  scripts/         audit de couverture et collecte d'echantillon
packages/app/      application React Native / Expo
docs/              decisions, methodologie, plan MVP, apercu
design-system/     design system et ecarts assumes
```

## Conventions

- **Le moteur n'a aucune dependance** et n'en prend pas. Il tourne sous Node
  avec `--experimental-strip-types`, d'ou les imports avec extension `.ts`.
- **L'application importe le moteur directement**, sans couche d'adaptation.
  Ses imports sont **sans extension** : c'est la convention Metro.
- **Toute entree du referentiel porte au moins une source** et une plage
  d'usage. Un test d'integrite le verifie.
- **Le calibrage des poids de scoring est provisoire** et attend une validation
  par une competence en cosmetologie et en ecotoxicologie. Ne pas presenter les
  notes comme etablies avant cela.
- Reponses et documentation **en francais**.

## Points d'attention

- Les valeurs reglementaires (Annexes du reglement 1223/2009) sont amendees
  plusieurs fois par an et doivent etre auditees contre EUR-Lex avant
  production.
- Les donnees de type de peau et de tolerance sont des **donnees de sante** au
  sens du RGPD. Le sujet n'est pas traite et conditionne l'architecture.
- Lucy ne delivre pas de conseil medical.
