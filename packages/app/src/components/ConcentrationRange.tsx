import { StyleSheet, Text, View } from 'react-native';
import type { ConcentrationEstimate } from '@lucy/engine';
import { formatRange } from '@lucy/engine';
import { radius, space, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';

/**
 * Intervalle de concentration estimé.
 *
 * Le composant central de la promesse de Lucy. Il n'affiche jamais un point :
 * la formule reelle n'est pas publique, seule une fourchette est defendable.
 * La barre rend cette fourchette visible, de sorte que l'utilisateur voie
 * l'ampleur de l'incertitude au lieu de lire un chiffre qui n'existe pas.
 *
 * L'echelle est logarithmique : les concentrations utiles s'etendent de
 * 0,001 % (allergène de parfum) a 90 % (phase aqueuse), et une echelle
 * lineaire ecraserait tout le bas du spectre, la ou se joue precisement la
 * difference entre une trace et une dose active.
 */

const MIN_PERCENT = 0.001;
const MAX_PERCENT = 100;

/** Position de 0 a 1 sur l'echelle logarithmique. */
function scalePosition(percent: number): number {
  if (percent <= MIN_PERCENT) return 0;
  const ratio =
    Math.log10(percent / MIN_PERCENT) / Math.log10(MAX_PERCENT / MIN_PERCENT);
  return Math.max(0, Math.min(1, ratio));
}

interface Props {
  estimate: ConcentrationEstimate;
  /** Dose a partir de laquelle l'ingrédient produit son effet, si connue. */
  threshold?: number;
  /** Libelle du repere de seuil. */
  thresholdLabel?: string;
}

export function ConcentrationRange({ estimate, threshold, thresholdLabel }: Props) {
  const palette = usePalette();

  const start = scalePosition(estimate.min);
  const end = scalePosition(estimate.max);
  // Largeur minimale pour qu'un intervalle très etroit reste visible.
  const width = Math.max(end - start, 0.015);
  const thresholdAt = threshold !== undefined ? scalePosition(threshold) : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[type.smallMedium, { color: palette.text }]}>
          {formatRange(estimate)}
        </Text>
        {thresholdLabel ? (
          <Text style={[type.caption, { color: palette.textSubtle }]}>{thresholdLabel}</Text>
        ) : null}
      </View>

      <View
        style={[styles.track, { backgroundColor: palette.surfaceMuted }]}
        accessibilityLabel={`Concentration estimée entre ${estimate.min} et ${estimate.max} pour cent`}
      >
        <View
          style={[
            styles.range,
            {
              backgroundColor: palette.primary,
              left: `${start * 100}%`,
              width: `${width * 100}%`,
            },
          ]}
        />
        {thresholdAt !== undefined ? (
          <View
            style={[
              styles.threshold,
              { left: `${thresholdAt * 100}%`, backgroundColor: palette.text },
            ]}
          />
        ) : null}
      </View>

      <View style={styles.axis}>
        <Text style={[type.caption, { color: palette.textSubtle }]}>0,001 %</Text>
        <Text style={[type.caption, { color: palette.textSubtle }]}>1 %</Text>
        <Text style={[type.caption, { color: palette.textSubtle }]}>100 %</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 8, borderRadius: radius.pill, position: 'relative', overflow: 'visible' },
  range: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.pill },
  threshold: { position: 'absolute', top: -4, width: 2, height: 16, borderRadius: 1 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
