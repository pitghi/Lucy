import { StyleSheet, Text, View } from 'react-native';
import type { Confidence as ConfidenceValue } from '@lucy/engine';
import { presentConfidence, space, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';

/**
 * Niveau de confiance d'une estimation.
 *
 * Rendu en gris et par une echelle de points, distincte de celle des scores :
 * une estimation peu sure n'est pas un mauvais resultat, c'est une information
 * moins precise. Lui donner les couleurs du score la ferait lire comme un
 * jugement sur le produit.
 */
export function ConfidenceIndicator({ value }: { value: ConfidenceValue }) {
  const palette = usePalette();
  const { label, color, dots } = presentConfidence(value, palette);

  return (
    <View style={styles.row} accessibilityLabel={`Estimation de ${label}`}>
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no">
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index < dots ? color : 'transparent',
                borderColor: index < dots ? color : palette.borderStrong,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[type.caption, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1 },
});
