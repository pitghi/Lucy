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
| Referentiel ingredients | 108 entrees, perimetre soin visage |
| Estimation des concentrations | fonctionnel |
| Score tolerance cutanee | fonctionnel |
| Score environnement | fonctionnel, calibrage provisoire |
| Score d'adequation au profil | fonctionnel |
| Moteur de recommandation | fonctionnel (regles) |
| Application mobile Expo | a faire |
| Source de donnees produits | a faire — risque principal du projet |

## Utilisation

```bash
npm install
npm test --workspace @lucy/engine        # 58 tests
npm run typecheck --workspace @lucy/engine
npm run demo --workspace @lucy/engine    # demonstration sur des formules types
```

La demonstration se termine par le cas d'ecole du projet : deux serums
mentionnent la niacinamide sur leur liste INCI, un seul la dose reellement.
Une notation par simple presence de l'ingredient les crediterait a l'identique.

## Documentation

- [`docs/methodologie.md`](docs/methodologie.md) — le modele de scoring en
  detail. Ce document est destine a etre publie : la transparence de la methode
  est une condition de credibilite autant qu'une protection.
- [`docs/mvp.md`](docs/mvp.md) — perimetre, etapes et risques du MVP.

## Avertissements

- Lucy ne delivre pas de conseil medical. Une reaction cutanee releve d'un avis
  dermatologique.
- Les valeurs reglementaires du referentiel doivent etre auditees contre les
  textes consolides avant toute mise en production : les Annexes du reglement
  1223/2009 sont amendees plusieurs fois par an.
- Le calibrage des poids de scoring est provisoire et doit etre valide par une
  competence en cosmetologie et en ecotoxicologie.
