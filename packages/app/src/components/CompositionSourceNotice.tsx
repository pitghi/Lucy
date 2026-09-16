import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Globe } from 'lucide-react-native';
import { radius, space, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';

/**
 * Provenance d'une composition retrouvee sur le web.
 *
 * Quand aucune base ouverte ne porte la liste d'ingredients, elle est cherchee
 * sur le web (decision 3.9). Ce qui en revient n'a pas le statut d'une fiche
 * produit : la page peut decrire une autre contenance, une formule anterieure,
 * ou un produit homonyme. Les trois scores sont pourtant calcules dessus.
 *
 * L'ecart se dit donc a l'endroit ou il compte — au-dessus des scores, pas en
 * note de bas de page — et l'adresse de la page est atteignable. Une note dont
 * on ne peut pas montrer la provenance ne se conteste pas, et tout le projet
 * consiste a rendre la contestation possible sur des faits (decision 6.1).
 *
 * Ce bandeau ne s'affiche pas pour une composition venue d'une fiche produit :
 * repeter la provenance a chaque ecran la banaliserait, et c'est justement
 * parce qu'elle est exceptionnelle qu'elle doit se voir.
 */
export function CompositionSourceNotice({ url }: { url: string }) {
  const palette = usePalette();

  /** Le domaine suffit a situer la source ; l'URL entiere deborderait. */
  const domaine = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ?? url;

  return (
    <View
      style={[styles.container, { backgroundColor: palette.warningSoft }]}
      accessibilityRole="alert"
    >
      <Globe size={16} color={palette.warning} strokeWidth={2} />
      <View style={styles.text}>
        <Text style={[type.caption, { color: palette.warning }]}>
          Composition trouvée sur le web, pas sur une fiche produit. Elle n'a pas été
          vérifiée sur l'emballage et peut concerner une autre contenance ou une formule
          antérieure. Les scores en dépendent entièrement.
        </Text>
        <Pressable
          onPress={() => Linking.openURL(url)}
          accessibilityRole="link"
          accessibilityLabel={`Ouvrir la source de la composition, ${domaine}`}
          hitSlop={8}
        >
          <Text style={[type.label, styles.link, { color: palette.warning }]}>
            Source : {domaine}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
  },
  text: { flex: 1, gap: space.xs },
  link: { textDecorationLine: 'underline' },
});
