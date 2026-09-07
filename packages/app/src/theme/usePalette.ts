import { useColorScheme } from 'react-native';
import { dark, light, type Palette } from './tokens';

/**
 * Palette du theme courant.
 *
 * Les deux themes sont definis cote a cote dans `tokens.ts` et testes
 * séparément : les contrastes du mode clair ne se transposent pas au mode
 * sombre (regle `color-dark-mode`).
 */
export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? (dark as unknown as Palette) : light;
}

/**
 * Vrai lorsque le thème sombre est actif. Les couleurs de score en dépendent :
 * elles ne sont pas inversées, elles changent de tonalité.
 */
export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
