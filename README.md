# Lucy

Application d'evaluation et de recommandation de produits cosmetiques, fondee
sur l'estimation de la **concentration** des ingredients et sur la separation
stricte de ce qui releve de la peau et de ce qui releve de l'environnement.

## Le probleme

Les notations existantes presentent deux limites structurelles :

1. **Elles ignorent le dosage.** Un conservateur present a 0,05 % et le meme
   a 1 % recoivent la meme penalite, alors que seul le second a un effet.
   Symetriquement, un actif saupoudre en fin de liste pour figurer sur
   l'emballage est credite comme s'il etait dose a sa concentration efficace.
2. **Elles melangent deux questions distinctes.** Un silicone est tres bien
   tolere par la peau et faiblement biodegradable ; une huile essentielle est
   biodegradable et allergisante. Moyenner ces deux axes produit une note qui
   n'informe sur aucun des deux.

## L'approche

Aucune marque ne publie ses dosages, et le reglement CE 1223/2009 n'impose
qu'un classement par poids decroissant, libre en dessous de 1 %. On ne peut
donc pas connaitre une concentration exacte a partir d'un code-barres — mais on
peut l'**encadrer**, et l'encadrement suffit a savoir si un ingredient est
present a une dose qui fait une difference.

Quatre contraintes sont combinees :

- l'ordre decroissant impose par le reglement, au-dessus de 1 % ;
- les **ancres de seuil** : certains ingredients ont une plage d'usage tres
  contrainte (phenoxyethanol au plus 1 %, EDTA environ 0,1 %, tocopherol au
  plus 0,5 %), ce qui borne tout ce qui les suit dans la liste ;
- les limites reglementaires par categorie de produit (Annexes UE) ;
- le bilan de masse, la formule totalisant 100 %.

Le resultat est un **intervalle assorti d'un niveau de confiance**, jamais une
valeur unique. L'interface doit afficher cette incertitude, pas la masquer.

Trois scores independants en decoulent, jamais moyennes entre eux :

| Score | Question a laquelle il repond |
| --- | --- |
| Tolerance cutanee | Cette formule risque-t-elle d'irriter ou de sensibiliser ? |
| Environnement | Quel est l'impact de cette formule sur les milieux ? |
| Adequation au profil | Ce produit est-il fait pour **cette** peau et **ces** besoins ? |

## Etat du depot

| Brique | Etat |
| --- | --- |
| Parsing des listes INCI | fonctionnel |
| Referentiel ingredients | 185 entrees, perimetre soin visage |
| Estimation des concentrations | fonctionnel |
| Score tolerance cutanee | fonctionnel |
| Score environnement | fonctionnel, calibrage provisoire |
| Score d'adequation au profil | fonctionnel |
| Moteur de recommandation | fonctionnel (regles) |
| Application mobile Expo | quatre ecrans, navigation a finaliser |
| Source de donnees produits | mesuree, voir ci-dessous |

## Faisabilite mesuree

Le risque principal du projet est la disponibilite des listes d'ingredients.
Il a ete mesure sur un echantillon de 323 produits de soin visage
d'Open Beauty Facts (`packages/engine/scripts/`) :

| Indicateur | Valeur |
| --- | --- |
| Produits portant une liste d'ingredients | 64,7 % |
| Liste exploitable (au moins 5 ingredients) | 58,2 % |
| Ingredients resolus par le referentiel | 71,4 % |
| Couverture medianne par produit | 70,4 % |
| Produits scorables parmi les listes exploitables | 51,6 % |

Deux enseignements :

- **La base ouverte ne suffit pas seule.** Quatre produits sur dix n'ont pas de
  liste exploitable. La lecture optique de la liste INCI et la contribution
  utilisateur ne sont pas un repli mais une brique de premier plan.
- **L'extension du referentiel se pilote par la mesure.** L'audit classe les
  ingredients manquants par frequence reelle ; suivre ce classement a fait
  passer la resolution de 51 % a 71 % en deux vagues d'ajout. C'est ce
  classement, et non l'exhaustivite de CosIng, qui ordonne le travail.

```bash
./packages/engine/scripts/fetch-sample.sh /tmp/lucy-sample
node --experimental-strip-types packages/engine/scripts/audit-coverage.ts /tmp/lucy-sample/sample.json
```

## Utilisation

```bash
npm install
npm test --workspace @lucy/engine        # 60 tests
npm run typecheck --workspace @lucy/engine
npm run demo --workspace @lucy/engine    # demonstration sur des formules types
```

La demonstration se termine par le cas d'ecole du projet : deux serums
mentionnent la niacinamide sur leur liste INCI, un seul la dose reellement.
Une notation par simple presence de l'ingredient les crediterait a l'identique.

## Documentation

- [`docs/decisions.md`](docs/decisions.md) — le journal des decisions : ce qui
  a ete tranche, pourquoi, ce qui a ete ecarte, ce qui reste ouvert. A lire
  avant de proposer un changement de conception.
- [`docs/methodologie.md`](docs/methodologie.md) — le modele de scoring en
  detail. Ce document est destine a etre publie : la transparence de la methode
  est une condition de credibilite autant qu'une protection.
- [`docs/mvp.md`](docs/mvp.md) — perimetre, etapes et risques du MVP.
- [`docs/apercu/`](docs/apercu/) — captures des ecrans, rendues par React Native.
- [`design-system/lucy/`](design-system/lucy/) — design system et ecarts assumes.
- [`CLAUDE.md`](CLAUDE.md) — contexte charge automatiquement par Claude Code.

## Avertissements

- Lucy ne delivre pas de conseil medical. Une reaction cutanee releve d'un avis
  dermatologique.
- Les valeurs reglementaires du referentiel doivent etre auditees contre les
  textes consolides avant toute mise en production : les Annexes du reglement
  1223/2009 sont amendees plusieurs fois par an.
- Le calibrage des poids de scoring est provisoire et doit etre valide par une
  competence en cosmetologie et en ecotoxicologie.
