# Methodologie de notation

Ce document decrit integralement la methode de calcul des scores Lucy. Il est
destine a etre publie et opposable : une marque doit pouvoir comprendre
pourquoi son produit obtient la note qu'il obtient, et la contester sur des
elements verifiables.

## 1. Ce que la loi permet de savoir

Le reglement (CE) 1223/2009 impose que les ingredients soient listes **par
ordre decroissant de poids au moment de l'incorporation**. Deux exceptions
importantes :

- **en dessous de 1 %, l'ordre est libre** ;
- les colorants peuvent etre listes a part, apres une mention « peut contenir »
  ou « +/- », et leur presence n'est alors pas garantie.

Aucun texte n'impose la publication des concentrations. Toute affirmation sur
un dosage precis, en dehors d'un chiffre revendique par la marque, est donc une
**estimation** et doit etre presentee comme telle.

## 2. Estimation des concentrations

### 2.1 Bornes initiales

Chaque ingredient recoit un intervalle de depart, par ordre de priorite
decroissante :

1. **Dosage revendique par la marque** (« 10 % niacinamide ») — intervalle
   reduit a un point, confiance elevee. Aucune contrainte deduite ne le remet
   ensuite en cause.
2. **Limite reglementaire** applicable a la categorie du produit (Annexes III,
   V et VI). Un produit sans rincage et un produit rince n'ont pas les memes
   plafonds.
3. **Plage d'usage habituelle en formulation**, renseignee dans le referentiel.
4. A defaut, l'intervalle non informatif `[0 %, 100 %]`.

La borne retenue est **la plus contraignante** des deux dernieres : une limite
legale de 25 % n'apprend rien sur un ingredient dont l'usage reel plafonne a
5 %, et inversement.

### 2.2 Ancrage par marqueurs de seuil

C'est le mecanisme central. Certains ingredients ont une plage d'usage
suffisamment contrainte pour servir de **borne** a tout ce qui les suit :

| Ingredient | Plafond | Origine |
| --- | --- | --- |
| Phenoxyethanol | 1 % | limite legale (Annexe V) |
| Benzyl alcohol | 1 % | limite legale (Annexe V) |
| Potassium sorbate | 0,6 % | limite legale (Annexe V) |
| Sodium benzoate | 0,5 % sans rincage | limite legale (Annexe V) |
| Tocopherol | 0,5 % | usage en formulation |
| Disodium EDTA | 0,2 % | usage en formulation |
| Xanthan gum, carbomer | 1 % | usage en formulation |
| Retinol | 0,3 % visage | limite legale (reglement 2024/996) |

L'ordre decroissant impose par la loi fait le reste : un ingredient liste
**apres** le phenoxyethanol est necessairement present a moins de 1 %, meme si
sa plage d'usage habituelle est bien superieure.

Consequence importante : lorsqu'un plafond deduit de la position rejoint ou
passe sous le plancher issu de la plage d'usage, **ce plancher est abandonne**.
L'information disponible se reduit alors a un majorant, et l'estimation se lit
« au plus 1 % » et non « exactement 1 % ».

### 2.3 Zone d'ordre libre

Des le premier ingredient dont le plafond propre atteint 1 %, on entre dans la
zone ou le reglement n'impose plus d'ordre. La monotonie decroissante cesse d'y
etre appliquee, mais le plafond de 1 % se propage a tout le reste de la liste.
La confiance des estimations y est degradee : la position n'y renseigne plus sur
la quantite.

### 2.4 Bilan de masse

La formule totalise 100 %. Un ingredient ne peut donc pas depasser ce que les
planchers des autres laissent disponible, et la tete de liste ne peut pas
descendre en dessous de ce que leurs plafonds laissent a combler. C'est cette
contrainte qui permet d'affirmer qu'une creme dont la liste commence par l'eau,
suivie d'ingredients tous plafonnes bas, contient au moins 75 % d'eau.

Les ingredients issus d'une mention « peut contenir » sont exclus du plancher
collectif, leur presence n'etant pas garantie.

### 2.5 Confiance

| Niveau | Cas |
| --- | --- |
| Elevee | dosage revendique par la marque, ou intervalle resserre a moins d'un point |
| Moyenne | plage d'usage connue, intervalle de moins de huit points |
| Faible | ingredient absent du referentiel, ou zone d'ordre libre |

Une penalite fondee sur une estimation de faible confiance est **atenuee**
(coefficient 0,6) : le moteur ne sanctionne pas fermement un produit sur une
hypothese fragile.

## 3. Score de tolerance cutanee

Part de 100 et ne descend qu'en presence d'un motif identifie et sourcé.

### 3.1 Ponderation par la dose

Chaque effet indesirable porte un **seuil** en dessous duquel il est considere
negligeable. La penalite suit une rampe :

- en dessous de la moitie du seuil : nulle ;
- entre la moitie du seuil et trois fois le seuil : croissance lineaire ;
- au-dela de trois fois le seuil : maximale.

C'est ce mecanisme qui evite de penaliser un ingredient present a l'etat de
trace. Un allergene de parfum liste en toute fin d'INCI est present a moins de
0,01 % : le sanctionner comme s'il etait a 5 % est l'erreur que cette methode
corrige.

### 3.2 Postes de penalite

| Poste | Poids | Remarque |
| --- | --- | --- |
| Irritation | 12 par point de severite | seuil propre a chaque ingredient |
| Effet degraissant | 8 par point de severite | tensioactifs principalement |
| Sensibilisant de contact reconnu | 14 | seuil de reference 0,01 % |
| Allergene de parfum declarable | 6 | seuil de reference 0,05 % |
| Indice comedogene | 2,5 par point | voir 3.4 |

Les effets propres a certains types de peau comptent a plein poids si le profil
correspond, sont ecartes s'il ne correspond pas, et sont retenus a demi-poids
en l'absence de profil.

### 3.3 Le poste parfum est plafonne

Une liste INCI mentionne « parfum », puis separement les allergenes a
declaration obligatoire qu'il contient : limonene, linalool, geraniol. **Ces
substances composent le parfum, elles ne s'y ajoutent pas.** Les penaliser une
a une revient a compter quatre fois le meme poste, et penalise une marque
precisement parce qu'elle est transparente sur sa composition.

La penalite cumulee du poste parfum est donc plafonnee (22 points, 34 pour une
peau declaree sensible). Les impacts affiches a l'utilisateur sont mis a
l'echelle de la penalite reellement retenue, pour que le calcul reste
verifiable a partir des lignes montrees.

### 3.4 Reserve sur la comedogenicite

Les indices comedogenes publies proviennent de tests sur oreille de lapin
menes dans les annees 1970, dont la transposition a la peau humaine n'est pas
etablie. Ils ne peuvent pas etre ignores, ils ne doivent pas etre traites comme
une preuve : leur poids est volontairement faible, ils ne s'appliquent qu'aux
peaux grasses et mixtes, et l'interface signale explicitement la faible
robustesse de la donnee.

## 4. Score environnement

Calcule **independamment** du precedent et jamais moyenne avec lui.

La logique de ponderation differe : la ou une irritation cutanee repond a un
seuil d'effet, l'impact environnemental est approximativement proportionnel a
la masse rejetee. Les poids s'expriment donc en points par pourcent de formule.

| Critere | Poids | Unite |
| --- | --- | --- |
| Ecotoxicite aquatique | 1 par niveau (0-3) | par pourcent de formule |
| Faible biodegradabilite | 2 | par pourcent de formule |
| Biodegradabilite moderee | 0,6 | par pourcent de formule |
| Persistance ou bioaccumulation | 2 | par pourcent de formule |
| Microplastique intentionnel | 25 | forfaitaire |

La contribution d'un ingredient sature a 20 % de la formule, sans quoi un seul
ingredient majoritaire monopoliserait le calcul.

Le microplastique est le seul critere non proportionne : le rejet est definitif
quelle que soit la quantite, et la substance fait l'objet d'une interdiction
progressive dans l'Union (reglement 2023/2055).

**Ce calibrage est provisoire.** Il produit une echelle discriminante sur les
formules types du marche, mais il n'est pas issu d'une analyse de cycle de vie
et doit etre revu avec une competence en ecotoxicologie avant publication de
notes.

## 5. Score d'adequation au profil

Ce score ne part pas de 100, mais du milieu de l'echelle (60). La raison est
directe : un score partant de 100 sature, et l'echelle ne distingue plus un
produit inoffensif mais sans interet d'un produit reellement adapte.

- Les actifs repondant aux preoccupations **declarees** font monter la note, a
  hauteur de leur force, de leur niveau de preuve et de la part de leur
  intervalle de concentration situee au-dessus de leur dose efficace. Un actif
  sous sa dose efficace ne rapporte rien.
- Les motifs d'intolerance font descendre la note, filtres par le type de peau.
- Un ingredient que l'utilisateur declare **bien tolerer** voit ses penalites
  annulees : le vecu de l'utilisateur prime sur la moyenne statistique.
- Un ingredient que l'utilisateur declare **ne pas tolerer** ramene le score a
  zero, sans compensation possible par la qualite du reste de la formule.

Le score de tolerance du produit, lui, reste inchange dans ce cas : il s'agit
d'une inadequation a un profil, pas d'un defaut de formulation.

## 6. Sources

- Reglement (CE) 1223/2009 relatif aux produits cosmetiques, Annexes II a VI
- Reglement (UE) 2024/996 (retinol, alpha-hydroxyacides, arbutine)
- Reglement (UE) 2023/1545 (extension de la liste des allergenes de parfum)
- Reglement (UE) 2023/2055 (microplastiques, REACH Annexe XVII)
- Base de donnees CosIng de la Commission europeenne
- Avis du Comite scientifique pour la securite des consommateurs (SCCS)
- Classifications ECHA pour les donnees de persistance et d'ecotoxicite

Chaque ligne d'explication affichee dans l'application porte ses propres
references, consultables par l'utilisateur.

## 7. Limites assumees

- L'estimation des concentrations reste une estimation. Elle ne remplace pas la
  formule reelle, que seule la marque connait.
- Le referentiel couvre le soin visage. Un produit hors de ce perimetre sera
  partiellement resolu, et l'application doit alors afficher son taux de
  couverture plutot qu'une note.
- Les seuils d'effet sont issus de la litterature et d'usages de formulation.
  Leur recalibrage a partir des retours de tolerance des utilisateurs est
  l'objectif de la version suivante, et constitue la donnee qu'aucune notation
  existante ne possede.
- Lucy ne delivre pas de conseil medical.

## 8. Droit de reponse

Une marque qui estime qu'un score repose sur une donnee erronee — plage
d'usage, limite reglementaire obsolete, dosage reel de sa formule — doit
pouvoir le signaler et obtenir correction. Le referentiel et la presente
methode etant publics, la contestation porte sur des elements verifiables.
