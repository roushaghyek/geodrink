import { Colors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export type Palette = typeof Colors.light;

/** Current theme colours. */
export function usePalette(): Palette {
  const { isDark } = useTheme();
  return isDark ? Colors.dark : Colors.light;
}
