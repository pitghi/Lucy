import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { ImageOff } from 'lucide-react-native';
import { radius, space, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';
import { useProductImage } from '../data/productImages';

/**
 * Photographie de l'emballage.
 *
 * Deux tailles pour deux usages : la vignette aide a retrouver un produit
 * dans une liste, le rendu de fiche confirme qu'on regarde le bon flacon.
 *
 * L'absence de photo est un etat ordinaire — Open Beauty Facts est une base
 * contributive — donc le repli occupe exactement la meme place que l'image.
 * Un emplacement qui s'affaisse quand la photo manque ferait sauter la mise
 * en page a chaque chargement.
 *
 * L'image est decorative au sens de l'accessibilite : le nom et la marque
 * sont deja lus juste a cote, et « photo de l'emballage » n'apporterait
 * qu'une redite au lecteur d'ecran.
 */

interface Props {
  barcode?: string;
  variant?: 'thumb' | 'hero';
}

const THUMB = 56;
const HERO_HEIGHT = 200;

export function ProductImage({ barcode, variant = 'thumb' }: Props) {
  const palette = usePalette();
  const { image, status } = useProductImage(barcode);
  const hero = variant === 'hero';

  const frame = [
    hero ? styles.hero : styles.thumb,
    { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
  ];

  if (status === 'loading') {
    return (
      <View style={frame} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <ActivityIndicator size="small" color={palette.textSubtle} />
      </View>
    );
  }

  if (status === 'missing' || !image) {
    return (
      <View style={frame} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <ImageOff
          size={hero ? 28 : 20}
          color={palette.textSubtle}
          strokeWidth={1.75}
        />
        {hero ? (
          <Text style={[type.caption, { color: palette.textSubtle }]}>
            Photo indisponible
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={frame} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image
        source={{ uri: hero ? image.full : image.small }}
        style={styles.image}
        // `contain` plutot que `cover` : les photos contributives sont cadrees
        // de façon tres inegale, et un recadrage automatique ampute autant
        // d'etiquettes qu'il en centre.
        resizeMode="contain"
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hero: {
    width: '100%',
    height: HERO_HEIGHT,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
});
