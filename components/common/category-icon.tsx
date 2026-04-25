import React from 'react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Maps preset category icon names to actual vector icon components.
 * Most preset icons use Feather; a few need MaterialCommunityIcons fallbacks.
 */

type FeatherName = React.ComponentProps<typeof Feather>['name'];
type MaterialName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IconMapping {
  set: 'feather' | 'material';
  name: FeatherName | MaterialName;
}

const ICON_MAP: Record<string, IconMapping> = {
  // Direct Feather matches
  briefcase: { set: 'feather', name: 'briefcase' },
  heart: { set: 'feather', name: 'heart' },
  moon: { set: 'feather', name: 'moon' },
  users: { set: 'feather', name: 'users' },
  book: { set: 'feather', name: 'book' },
  home: { set: 'feather', name: 'home' },
  // Feather alternatives for missing icons
  plane: { set: 'feather', name: 'navigation' },
  // MaterialCommunityIcons for icons not in Feather
  utensils: { set: 'material', name: 'silverware-fork-knife' },
  gamepad: { set: 'material', name: 'gamepad-variant-outline' },
  spa: { set: 'material', name: 'spa-outline' },
};

const DEFAULT_ICON: IconMapping = { set: 'feather', name: 'circle' };

/**
 * The set of icon keys recognized by `CategoryIcon`. Use this as the
 * palette for icon pickers (e.g. activity-override editor) so we never
 * surface a key that would silently fall back to the default circle.
 */
export const AVAILABLE_ICON_KEYS: readonly string[] = Object.keys(ICON_MAP);

interface CategoryIconProps {
  icon: string | null;
  size?: number;
  color?: string;
}

export function CategoryIcon({ icon, size = 18, color = '#282b51' }: CategoryIconProps): React.ReactElement {
  const mapping = (icon && ICON_MAP[icon]) || DEFAULT_ICON;

  if (mapping.set === 'material') {
    return (
      <MaterialCommunityIcons
        name={mapping.name as MaterialName}
        size={size}
        color={color}
      />
    );
  }

  return (
    <Feather
      name={mapping.name as FeatherName}
      size={size}
      color={color}
    />
  );
}
