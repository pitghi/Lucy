import { StyleSheet, Text, View } from 'react-native';
import { AlertOctagon, AlertTriangle, Shield, ShieldCheck } from 'lucide-react-native';
import { presentScore, radius, space, type, type ScoreAxis } from '../theme/index';
import { useIsDark, usePalette } from '../theme/usePalette';

/**
 * Un score sur un axe.
 *
 * Trois de ces lignes sont affichees cote a cote, jamais fusionnees. Un
 * silicone est excellent pour la peau et mediocre pour les milieux
 * aquatiques : moyenner les deux produirait une note qui n'informe sur aucun
 * des deux, ce qui est le defaut que Lucy corrige.
 *
 * Chaque ligne porte quatre informations redondantes a dessein — valeur,
 * libelle, longueur de barre, icone — afin qu'aucune ne soit indispensable a
 * la comprehension.
 */

const ICON_BY_LEVEL = {
  high: ShieldCheck,
  good: Shield,
  moderate: AlertTriangle,
  low: AlertOctagon,
} as const;

interface Props {
  axis: ScoreAxis;
  value: number;
  /** Masque la question explicative, pour les affichages compacts. */
  compact?: boolean;
}

export function ScoreRow({ axis, value, compact = false }: Props) {
  const palette = usePalette();
  const score = presentScore(axis, value, useIsDark());
  const Icon = ICON_BY_LEVEL[score.level];

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={score.accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: value }}
    >
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Icon size={18} color={score.color} strokeWidth={2} />
          <Text style={[type.smallMedium, { color: palette.text }]}>{score.title}</Text>
        </View>
        <View style={styles.valueGroup}>
          <Text style={[type.subtitle, { color: score.color }]}>{value}</Text>
          <Text style={[type.caption, { color: palette.textSubtle }]}>/100</Text>
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: palette.surfaceMuted }]}>
        <View
          style={[styles.fill, { backgroundColor: score.color, width: `${value}%` }]}
        />
      </View>

      {/* Le libelle textuel est la seule information non redondante pour un
          utilisateur qui ne percoit pas la couleur : il n'est jamais masque. */}
      <Text style={[type.caption, { color: score.color }]}>{score.label}</Text>

      {compact ? null : (
        <Text style={[type.caption, { color: palette.textSubtle }]}>{score.question}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleGroup: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  valueGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  track: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
