import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Lora_400Regular, Lora_600SemiBold } from '@expo-google-fonts/lora';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ScanLine, Sparkles, UserCog } from 'lucide-react-native';
import { assessProduct, type Product, type SkinProfile } from '@lucy/engine';
import { radius, space, TOUCH_MIN, type } from './src/theme/index';
import { usePalette } from './src/theme/usePalette';
import { ScanScreen } from './src/screens/ScanScreen';
import { ProductScreen } from './src/screens/ProductScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RecommendationsScreen } from './src/screens/RecommendationsScreen';
import { DEMO_CATALOG } from './src/data/catalog';

/**
 * Racine de l'application.
 *
 * La navigation est ici un simple etat local, suffisant pour ce premier jet
 * visuel. Elle devra passer a React Navigation avant toute mise en ligne :
 * la regle `deep-linking` imposé que chaque fiche produit soit atteignable par
 * une URL, ce qu'un etat local ne permet pas.
 */

type Tab = 'scan' | 'reco' | 'profile';

export default function App() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    Lora_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [tab, setTab] = useState<Tab>('scan');
  const [profile, setProfile] = useState<SkinProfile | null>({
    skinType: 'sensitive',
    concerns: ['redness', 'barrier'],
    tolerated: [],
    notTolerated: [],
  });
  const [selected, setSelected] = useState<Product | null>(null);

  const assessment = useMemo(
    () => (selected ? assessProduct(selected, profile ?? undefined) : null),
    [selected, profile],
  );

  const handleBarcode = useCallback((barcode: string) => {
    const found = DEMO_CATALOG.find((item) => item.barcode === barcode);
    setSelected(found ?? null);
  }, []);

  if (!fontsLoaded) return null;

  if (selected && assessment) {
    return (
      <SafeAreaProvider>
        <ProductScreen
          product={selected}
          assessment={assessment}
          onBack={() => setSelected(null)}
          onToleranceFeedback={() => setSelected(null)}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <View style={styles.screen}>
          {tab === 'scan' ? (
            <ScanScreen
              onBarcode={handleBarcode}
              // En attendant la lecture optique, la saisie ouvre un produit de
              // demonstration pour parcourir la fiche.
              onManualEntry={() => setSelected(DEMO_CATALOG[1] ?? null)}
            />
          ) : null}
          {tab === 'reco' ? (
            <RecommendationsScreen
              catalog={DEMO_CATALOG}
              profile={profile}
              onSelect={(recommendation) => setSelected(recommendation.product)}
              onEditProfile={() => setTab('profile')}
            />
          ) : null}
          {tab === 'profile' ? (
            <ProfileScreen
              initial={profile ?? undefined}
              onSave={(next) => {
                setProfile(next);
                setTab('reco');
              }}
            />
          ) : null}
        </View>

        <TabBar current={tab} onChange={setTab} />
        <StatusBar barStyle={tab === 'scan' ? 'light-content' : 'dark-content'} />
      </View>
    </SafeAreaProvider>
  );
}

/**
 * Barre d'onglets.
 *
 * Trois destinations de premier niveau, sous la limite de cinq
 * (`bottom-nav-limit`), chacune avec icone et libelle (`nav-label-icon`).
 * L'onglet actif est signale par la couleur, le poids du texte et un
 * indicateur, jamais par la couleur seule.
 */
function TabBar({ current, onChange }: { current: Tab; onChange: (tab: Tab) => void }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const tabs = [
    { key: 'scan' as const, label: 'Scanner', Icon: ScanLine },
    { key: 'reco' as const, label: 'Pour vous', Icon: Sparkles },
    { key: 'profile' as const, label: 'Profil', Icon: UserCog },
  ];

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: Math.max(insets.bottom, space.sm),
          backgroundColor: palette.card,
          borderTopColor: palette.border,
        },
      ]}
    >
      {tabs.map(({ key, label, Icon }) => {
        const active = current === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}
          >
            <View
              style={[
                styles.tabIndicator,
                { backgroundColor: active ? palette.primary : 'transparent' },
              ]}
            />
            <Icon
              size={22}
              color={active ? palette.primary : palette.textSubtle}
              strokeWidth={active ? 2.25 : 1.75}
            />
            <Text
              style={[
                active ? type.label : type.caption,
                { color: active ? palette.primary : palette.textSubtle },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: space.sm,
    ...(Platform.OS === 'web' ? {} : {}),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    minHeight: TOUCH_MIN,
    paddingBottom: space.xs,
  },
  tabIndicator: {
    width: 24,
    height: 3,
    borderRadius: radius.pill,
    marginBottom: space.xs,
  },
});
