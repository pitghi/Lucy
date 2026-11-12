# Ecarts assumes au MASTER — application mobile

Le MASTER a ete genere pour un pattern de **landing page**, puis revise pour
porter la direction artistique de l'application (decision 5.15). L'application
mobile en reprend le style et la logique de confiance ; ce fichier dit ce qui
lui est propre.

## 1. Pattern : application, pas landing

Le pattern « Real-Time / Operations Landing » ne s'applique pas. La navigation
suit `bottom-nav-limit` (4 onglets : Scanner, Rechercher, Pour vous, Profil) et
`nav-label-icon` (icone + libelle sur chaque onglet).

Le style **Trust & Authority** du MASTER est en revanche conserve tel quel :
c'est exactement le positionnement de Lucy. Il se traduit ici par les sources
affichees sur chaque ligne d'explication et par les niveaux de confiance
visibles, qui remplacent les badges et certifications d'une landing.

## 2. Palette : l'ADN brun, creme, bleu layette

Le MASTER porte desormais la palette de la direction artistique (decision 5.15),
qui remplace le socle Healthcare retenu au depart. Deux consequences propres a
une application qui affiche des notes :

### Couleurs de score : pas de feu tricolore

Decision structurante. Les notations existantes reduisent un produit a un feu
vert / orange / rouge, ce que Lucy corrige. Deux consequences :

- L'echelle de score n'emploie pas le vert : la sémantique « vert = bon » est
  celle des applications concurrentes et importerait leur simplification. Le
  registre va du bleu marine au bleu denim, puis a l'ocre et a la terre cuite —
  les bleus de l'ADN, les terres du brun.
- `color-not-only` est applique sans exception : **chaque score porte un
  libelle textuel** (« Bonne tolerance », « Tolerance moyenne »), presente en
  pastille. Un score n'est jamais lisible par sa seule couleur, ce qui le rend
  accessible aux daltonismes et compatible avec les lecteurs d'ecran.

### Le bleu des actions n'est pas celui des donnees

Le bleu layette est trop clair pour se lire sur la creme : il reste l'aplat des
actions. Quand une donnee doit etre bleue — bonus d'un motif, intervalle de
concentration — c'est le bleu soutenu `primaryStrong`. Le lecteur ne confond
donc pas « ce sur quoi j'appuie » et « ce que la formule vaut ».

## 3. Typographie : Instrument Serif en titres, Inter en corps

Le MASTER genere au depart recommandait **Lora / Raleway**. Lora a tenu les titres
jusqu'a la direction artistique de 5.15, qui la remplace par **Instrument
Serif**, le serif de la reference : meme registre editorial, au service de la
credibilite et differenciant face aux concurrents en sans-serif geometrique,
avec en plus l'accent italique sur un mot.

Raleway est remplace par **Inter** pour le corps, en application de la regle
`number-tabular` du skill : l'interface affiche en permanence des
concentrations, des intervalles et des scores. Inter fournit des chiffres
tabulaires, ce qui evite le decalage de mise en page entre « 0,3 a 1 % » et
« 10 % », et reste lisible a petite taille sur de la donnee dense. Raleway,
concu pour de l'affichage, s'y prete mal. Ce choix ne dependait pas de la
palette et n'a pas change.

## 4. Regles specifiques a ce produit

L'incertitude doit rester visible. Trois consequences d'interface :

- **Un intervalle ne se resume jamais a un point.** Une concentration estimee
  s'affiche « 0,3 a 1 % », ou « au plus 1 % » quand la borne basse est
  inconnue. Jamais une moyenne.
- **La confiance accompagne chaque estimation.** Un badge a trois niveaux, avec
  libelle, jamais une couleur seule.
- **La couverture du referentiel est annoncee.** En dessous de 70 %
  d'ingredients resolus, l'ecran affiche une analyse partielle assumee plutot
  qu'un score complet, conformement a `empty-data-state` et `error-clarity`.
