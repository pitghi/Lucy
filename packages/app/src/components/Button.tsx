import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { radius, space, TOUCH_MIN, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';

/**
 * Boutons de l'application.
 *
 * Un seul traitement par role, pour que la regle de la direction artistique
 * tienne partout sans etre reecrite ecran par ecran :
 *
 * - **primaire** : gelule bleu layette, texte brun — le « Add to bag » de la
 *   reference. C'est le seul aplat bleu de l'interface avec l'onglet actif :
 *   s'il y en a deux a l'ecran, l'un des deux est de trop ;
 * - **secondaire** : gelule a contour brun, sans aplat. Elle se lit comme une
 *   action, sans disputer l'attention a la primaire.
 *
 * Seule l'opacite change a la pression : la mise en page reste stable.
 */

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  /** `lg` pour l'action d'un ecran, `md` pour une action dans une carte. */
  size?: 'md' | 'lg';
  icon?: LucideIcon;
  disabled?: boolean;
  /** Remplace le libelle par un indicateur d'activite, sans changer la taille. */
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Mise en page seulement (largeur, marges) : l'apparence vient du variant. */
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon: IconComponent,
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  const palette = usePalette();
  const primary = variant === 'primary';

  // L'etat inactif ne passe pas par la transparence : un aplat creme et un
  // texte attenue se lisent comme « pas encore », sans paraitre casse.
  const background = disabled ? palette.surfaceMuted : primary ? palette.primary : 'transparent';
  const border = disabled ? palette.surfaceMuted : primary ? palette.primary : palette.secondary;
  const foreground = disabled ? palette.textSubtle : primary ? palette.onPrimary : palette.text;
  const large = size === 'lg';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, busy: loading }}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      style={({ pressed }) => [
        styles.base,
        large ? styles.large : styles.medium,
        { backgroundColor: background, borderColor: border },
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {IconComponent ? (
            <IconComponent size={large ? 18 : 17} color={foreground} strokeWidth={2} />
          ) : null}
          <Text style={[large ? type.bodyMedium : type.smallMedium, { color: foreground }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

interface TextLinkProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  /** `small` en corps de texte, `caption` dans une ligne dense. */
  size?: 'small' | 'caption';
  style?: StyleProp<ViewStyle>;
}

/**
 * Lien d'action dans le texte : encre brune soulignee, comme les liens de la
 * reference. Le soulignement porte l'interactivite — le bleu reste reserve
 * aux boutons, et un lien colore se confondrait avec une valeur de score.
 */
export function TextLink({
  label,
  onPress,
  accessibilityLabel,
  size = 'small',
  style,
}: TextLinkProps) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={8}
      style={({ pressed }) => [styles.link, pressed && styles.pressed, style]}
    >
      <Text
        style={[
          size === 'small' ? type.smallMedium : type.label,
          styles.underline,
          { color: palette.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: space.xl,
  },
  large: { minHeight: TOUCH_MIN + 8 },
  medium: { minHeight: TOUCH_MIN, paddingHorizontal: space.lg },
  pressed: { opacity: 0.75 },
  link: { minHeight: TOUCH_MIN, justifyContent: 'center', alignSelf: 'flex-start' },
  underline: { textDecorationLine: 'underline' },
});
