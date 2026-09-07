# @lucy/app

Application mobile Lucy (React Native / Expo).

## Lancer

```bash
npm install                 # depuis la racine du monorepo
npm run ios   --workspace @lucy/app    # simulateur iOS (macOS requis)
npm run android --workspace @lucy/app  # emulateur Android
npm run web   --workspace @lucy/app    # navigateur, pour un apercu rapide
```

Le moteur `@lucy/engine` est importe directement : c'est du TypeScript sans
dependance, aucune couche d'adaptation n'est necessaire.

## Ecrans

| Ecran | Role |
| --- | --- |
| `ScanScreen` | Lecture du code-barres, et saisie de la liste INCI presentee au meme niveau |
| `ProductScreen` | Trois scores separes, puis leurs motifs sources et la composition estimee |
| `ProfileScreen` | Type de peau, preoccupations, ingredients non toleres |
| `RecommendationsScreen` | Classement pour le profil, avec le motif de chaque position |

## Regles de design a ne pas casser

Le detail et la justification sont dans
[`design-system/lucy/pages/app-mobile.md`](../../design-system/lucy/pages/app-mobile.md).
Les quatre regles structurantes :

1. **Trois scores, jamais fusionnes.** Un silicone est bien tolere par la peau
   et faiblement biodegradable ; une moyenne n'informerait sur aucun des deux.
2. **Pas de feu tricolore, et jamais la couleur seule.** L'echelle n'emploie
   pas le vert, semantique des applications concurrentes. Chaque score porte un
   libelle textuel : la note reste lisible en niveaux de gris et par un lecteur
   d'ecran.
3. **L'incertitude reste visible.** Une concentration s'affiche « entre 0,3 et
   1 % » ou « sous 1 % », jamais par sa moyenne, et chaque estimation porte son
   niveau de confiance. La couverture du referentiel est annoncee, et sous 70 %
   l'ecran bascule sur une analyse partielle assumee.
4. **Chaque motif porte ses sources.** Une note sans motif ne se distingue pas
   d'un avis, et une marque doit pouvoir contester le calcul sur des elements
   verifiables.

## Reste a faire

- **React Navigation.** La navigation est un etat local, suffisant pour ce
  premier jet. La regle `deep-linking` impose qu'une fiche produit soit
  atteignable par une URL : a brancher avant toute mise en ligne.
- **Lecture optique de la liste INCI.** L'audit de couverture a montre que
  quatre produits sur dix n'ont pas de liste exploitable dans les bases
  ouvertes. L'ecran de scan y renvoie deja, mais l'ecran de saisie lui-meme
  reste a ecrire. C'est la priorite fonctionnelle suivante.
- **Persistance du profil et du journal de tolerance.**
- **Verification sur appareil reel** des surfaces tactiles, de l'agrandissement
  systeme du texte et du mode « animations reduites ».

## Apercu

Les captures de `docs/apercu/` sont produites depuis le rendu web reel
(React Native Web), en fenetre 390 x 844 :

```bash
npm run web --workspace @lucy/app
```
