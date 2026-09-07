import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import { BookOpen, ChevronDown, Info, Minus, Plus } from 'lucide-react-native';
import type { ConcentrationEstimate, ScoreReason } from '@lucy/engine';
import { motion, radius, space, TOUCH_MIN, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';
import { ConcentrationRange } from './ConcentrationRange';
import { ConfidenceIndicator } from './Confidence';

/**
 * Une ligne d'explication du score.
 *
 * C'est le produit lui-meme. Une note sans son motif ne se distingue pas d'un
 * avis, et une marque doit pouvoir contester le calcul sur des elements
 * verifiables : chaque ligne porte donc l'ingrédient, son impact chiffre, la
 * concentration estimée, le niveau de confiance, et ses sources.
 *
 * Les sources sont replisees par defaut (`progressive-disclosure`) mais
 * toujours atteignables : leur absence rendrait la note non verifiable.
 */

/**
 * Retire la mention d'intervalle d'une explication, la barre de concentration
 * la portant déjà. Le moteur produit une phrase autonome, utilisable hors de
 * l'application ; l'interface n'en garde que la partie non redondante.
 */
function withoutEstimate(label: string): string {
  return label.replace(/\s*;\s*estimé (?:à|sous|entre).*$/u, '');
}

interface Props {
  reason: ScoreReason;
  /** Estimation correspondante, pour tracer l'intervalle. */
  estimate?: ConcentrationEstimate;
}

export function ReasonCard({ reason, estimate }: Props) {
  const palette = usePalette();
  const [expanded, setExpanded] = useState(false);

  const isBonus = reason.impact > 0 && !reason.informational;
  const isInfo = reason.informational === true;

  const accentColor = isInfo
    ? palette.textMuted
    : isBonus
      ? palette.primary
      : palette.danger;

  const ImpactIcon = isInfo ? Info : isBonus ? Plus : Minus;

  const toggle = () => {
    LayoutAnimation.configureNext({
      duration: expanded ? motion.exit : motion.enter,
      update: { type: 'easeInEaseOut' },
    });
    setExpanded(!expanded);
  };

  const impactText = isInfo
    ? 'information'
    : `${isBonus ? '+' : '-'}${Math.abs(reason.impact).toFixed(0)} points`;

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.head}>
        <View style={[styles.impactBadge, { backgroundColor: palette.surfaceMuted }]}>
          <ImpactIcon size={14} color={accentColor} strokeWidth={2.5} />
        </View>

        <View style={styles.headText}>
          <Text style={[type.bodyMedium, { color: palette.text }]}>{reason.inci}</Text>
          {/* L'impact est ecrit, pas seulement code par une couleur. */}
          <Text style={[type.caption, { color: accentColor }]}>{impactText}</Text>
        </View>
      </View>

      {/* Quand la barre de concentration est affichée, elle porte déjà
          l'intervalle : le répéter dans la phrase alourdit la lecture. */}
      <Text style={[type.small, { color: palette.textMuted }]}>
        {estimate ? withoutEstimate(reason.label) : reason.label}
      </Text>

      {estimate ? (
        <View style={[styles.rangeBlock, { backgroundColor: palette.surfaceMuted }]}>
          <ConcentrationRange estimate={estimate} />
        </View>
      ) : null}

      <ConfidenceIndicator value={reason.confidence} />

      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? 'Masquer les sources de cette explication'
            : `Afficher les ${reason.sources.length} sources de cette explication`
        }
        style={({ pressed }) => [styles.sourceToggle, pressed && styles.pressed]}
        hitSlop={8}
      >
        <BookOpen size={14} color={palette.primary} strokeWidth={2} />
        <Text style={[type.label, { color: palette.primary }]}>
          {reason.sources.length} source{reason.sources.length > 1 ? 's' : ''}
        </Text>
        <ChevronDown
          size={14}
          color={palette.primary}
          strokeWidth={2}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {expanded ? (
        <View style={[styles.sources, { borderTopColor: palette.border }]}>
          {reason.sources.map((source, index) => (
            <Text key={index} style={[type.caption, { color: palette.textMuted }]}>
              {'•'}  {source}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  impactBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { flex: 1, gap: 2 },
  rangeBlock: { padding: space.md, borderRadius: radius.md },
  sourceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: TOUCH_MIN,
    marginBottom: -space.md,
  },
  // L'etat presse ne modifie que l'opacite : aucun deplacement de mise en page.
  pressed: { opacity: 0.6 },
  sources: { borderTopWidth: 1, paddingTop: space.md, gap: space.sm },
});
