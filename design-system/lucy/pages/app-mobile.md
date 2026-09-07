# Ecarts assumes au MASTER — application mobile

Le MASTER a ete genere pour un pattern de **landing page**. L'application
mobile en reprend le style et la logique de confiance, mais s'en ecarte sur
trois points, chacun justifie par une regle du skill lui-meme.

## 1. Pattern : application, pas landing

Le pattern « Real-Time / Operations Landing » ne s'applique pas. La navigation
suit `bottom-nav-limit` (3 onglets : Scanner, Recommandations, Profil) et
`nav-label-icon` (icone + libelle sur chaque onglet).

Le style **Trust & Authority** du MASTER est en revanche conserve tel quel :
c'est exactement le positionnement de Lucy. Il se traduit ici par les sources
affichees sur chaque ligne d'explication et par les niveaux de confiance
visibles, qui remplacent les badges et certifications d'une landing.

## 2. Palette : socle Healthcare, pas Beauty

Le domaine `color` propose une palette « Beauty/Spa/Wellness » rose et lavande.
Elle est ecartee : elle signale un produit de beaute lifestyle, quand Lucy vend
de la rigueur analytique. La palette **Healthcare App** est retenue, avec un
fond neutralise (`#F8FAFC` plutot que `#ECFEFF`) pour ne pas teinter les
surfaces de donnees.

### Couleurs de score : pas de feu tricolore

Decision structurante. Les notations existantes reduisent un produit a un feu
vert / orange / rouge, ce que Lucy corrige. Deux consequences :

- L'echelle de score n'emploie pas le vert : la sémantique « vert = bon » est
  celle des applications concurrentes et importerait leur simplification. Le
  registre est un teal soutenu vers un ambre puis un rouge brique.
- `color-not-only` est applique sans exception : **chaque score porte un
  libelle textuel** (« Bonne tolerance », « Tolerance moyenne »). Un score
  n'est jamais lisible par sa seule couleur, ce qui le rend accessible aux
  daltonismes et compatible avec les lecteurs d'ecran.

## 3. Typographie : Lora en titres, Inter en corps

Le MASTER recommande **Lora / Raleway**. Lora est conserve pour les titres :
son registre editorial sert la credibilite scientifique et distingue Lucy des
applications concurrentes, toutes en sans-serif geometrique.

Raleway est remplace par **Inter** pour le corps, en application de la regle
`number-tabular` du skill : l'interface affiche en permanence des
concentrations, des intervalles et des scores. Inter fournit des chiffres
tabulaires, ce qui evite le decalage de mise en page entre « 0,3 a 1 % » et
« 10 % », et reste lisible a petite taille sur de la donnee dense. Raleway,
concu pour de l'affichage, s'y prete mal.

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
