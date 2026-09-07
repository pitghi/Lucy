import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { motion, radius, space, TOUCH_MIN, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';

/**
 * Option selectionnable du profil.
 *
 * L'etat selectionne est porte par trois signaux simultanes — fond teinte,
 * bordure accentuee, coche — de sorte qu'il reste lisible sans percevoir la
 * couleur. L'etat est egalement annonce aux lecteurs d'ecran via
 * `accessibilityState.selected`.
 */

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Variante d'exclusion : signale un rejet plutot qu'un choix. */
  tone?: 'default' | 'exclude';
}

export function Chip({ label, selected, onPress, tone = 'default' }: ChipProps) {
  const palette = usePalette();
  const isExclude = tone === 'exclude';

  const activeColor = isExclude ? palette.danger : palette.primary;
  const activeBackground = isExclude ? palette.dangerSoft : palette.primarySoft;
  const Icon = isExclude ? X : Check;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? activeBackground : palette.card,
          borderColor: selected ? activeColor : palette.border,
        },
        // Seule l'opacite change au presse : la mise en page reste stable.
        pressed && { opacity: 0.7 },
      ]}
    >
      {selected ? <Icon size={15} color={activeColor} strokeWidth={2.5} /> : null}
      <Text style={[type.smallMedium, { color: selected ? activeColor : palette.textMuted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Groupe de chips, avec retour a la ligne automatique. */
export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    // Hauteur minimale conforme a la surface tactile requise.
    minHeight: TOUCH_MIN,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});

export const CHIP_MOTION = motion.micro;
