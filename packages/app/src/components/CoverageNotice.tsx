import { StyleSheet, Text, View } from 'react-native';
import { ScanSearch } from 'lucide-react-native';
import { MIN_COVERAGE_TO_SCORE, radius, space, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';

/**
 * Couverture du referentiel sur la formule analysee.
 *
 * L'audit mesure 71 % de resolution moyenne : une part des ingrédients d'un
 * produit reel reste inconnue. Afficher une note calculee sur la moitie d'une
 * formule serait une precision empruntee, donc l'ecran annonce toujours sa
 * couverture, et bascule sur une analyse partielle assumee en dessous du
 * seuil.
 */
export function CoverageNotice({ coverage }: { coverage: number }) {
  const palette = usePalette();
  const percent = Math.round(coverage * 100);
  const partial = coverage < MIN_COVERAGE_TO_SCORE;

  const background = partial ? palette.warningSoft : palette.surfaceMuted;
  const accent = partial ? palette.warning : palette.textMuted;

  return (
    <View
      style={[styles.container, { backgroundColor: background }]}
      accessibilityRole="alert"
    >
      <ScanSearch size={16} color={accent} strokeWidth={2} />
      <Text style={[type.caption, { color: accent, flex: 1 }]}>
        {partial
          ? `Analyse partielle : ${percent} % des ingrédients sont identifiés. Les scores restent indicatifs.`
          : `${percent} % des ingrédients de cette formule sont identifiés.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
  },
});
