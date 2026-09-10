"""Generation des icones Lucy.

La marque figure la these du projet : une liste INCI est ordonnee par
concentration decroissante, et sous le seuil d'effet un ingredient ne compte
plus. D'ou quatre barres decroissantes, la derniere estompee.

Palette : primary #0E7490 des jetons de design. Aucune couleur inventee.
Rendu par sur-echantillonnage x4 puis reduction Lanczos : PIL ne lisse pas les
formes autrement.
"""
from PIL import Image, ImageDraw

S = 4  # facteur de sur-echantillonnage

TEAL_HAUT = (18, 135, 159)
TEAL_BAS = (11, 92, 112)
BLANC = (255, 255, 255)
ALPHA_TRACE = 97  # ~38 % : la barre sous le seuil d'effet

# Geometrie des barres, exprimee en fraction du cote, pour etre reutilisable
# a toutes les tailles et sur toutes les cibles.
X0 = 200 / 1024
Y0 = 230 / 1024
H = 92 / 1024
GAP = 56 / 1024
R = 46 / 1024
LARGEURS = [628 / 1024, 476 / 1024, 344 / 1024, 220 / 1024]


def degrade(taille):
    """Fond teal, degrade vertical discret."""
    img = Image.new('RGB', (taille, taille), TEAL_HAUT)
    d = ImageDraw.Draw(img)
    for y in range(taille):
        t = y / max(taille - 1, 1)
        d.line(
            [(0, y), (taille, y)],
            fill=tuple(round(a + (b - a) * t) for a, b in zip(TEAL_HAUT, TEAL_BAS)),
        )
    return img


def barres(taille, couleur, echelle=1.0, decalage=(0, 0)):
    """Couche RGBA des quatre barres, centree, mise a l'echelle demandee."""
    couche = Image.new('RGBA', (taille, taille), (0, 0, 0, 0))
    d = ImageDraw.Draw(couche)
    c = taille / 2

    def e(v):  # fraction -> pixels, autour du centre
        return v * taille * echelle

    hauteur_bloc = e(4 * H + 3 * GAP)
    y = c - hauteur_bloc / 2 + decalage[1] * taille
    x = c - e(LARGEURS[0]) / 2 + decalage[0] * taille
    for i, larg in enumerate(LARGEURS):
        alpha = ALPHA_TRACE if i == len(LARGEURS) - 1 else 255
        d.rounded_rectangle(
            [x, y, x + e(larg), y + e(H)],
            radius=e(R),
            fill=(*couleur, alpha),
        )
        y += e(H) + e(GAP)
    return couche


def reduire(img, cible):
    return img.resize((cible, cible), Image.LANCZOS)


def tuile(taille, arrondie):
    """Tuile teal + barres blanches. `arrondie` ajoute le masque iOS."""
    grand = taille * S
    fond = degrade(grand).convert('RGBA')
    fond.alpha_composite(barres(grand, BLANC))
    if arrondie:
        masque = Image.new('L', (grand, grand), 0)
        ImageDraw.Draw(masque).rounded_rectangle(
            [0, 0, grand - 1, grand - 1], radius=round(grand * 0.2237), fill=255
        )
        fond.putalpha(masque)
    return reduire(fond, taille)


# 1. icon.png — iOS et App Store : carre plein, sans canal alpha.
#    App Store Connect rejette toute icone transparente.
tuile(1024, arrondie=False).convert('RGB').save('assets/icon.png')

# 2. adaptive-icon.png — Android : avant-plan seul, fond declare dans app.json.
#    Le contenu tient dans le cercle interieur de 66 %, zone jamais rognee.
av = Image.new('RGBA', (1024 * S, 1024 * S), (0, 0, 0, 0))
av.alpha_composite(barres(1024 * S, BLANC, echelle=0.60))
reduire(av, 1024).save('assets/adaptive-icon.png')

# 3. splash.png — toile au format de l'ecran, marque petite et centree :
#    `resizeMode: contain` mettrait une image carree a la largeur de l'ecran.
LARG, HAUT, MARQUE = 1284, 2778, 384
spl = Image.new('RGBA', (LARG, HAUT), (0, 0, 0, 0))
spl.paste(tuile(MARQUE, arrondie=True), ((LARG - MARQUE) // 2, (HAUT - MARQUE) // 2))
spl.save('assets/splash.png')

# 4. favicon.png — apercu web.
tuile(48, arrondie=True).save('assets/favicon.png')

print('icones generees')
