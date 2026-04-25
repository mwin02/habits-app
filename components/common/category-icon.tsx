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
  // Work / focus
  briefcase: { set: 'feather', name: 'briefcase' },
  code: { set: 'feather', name: 'code' },
  'edit-3': { set: 'feather', name: 'edit-3' },
  pen: { set: 'material', name: 'pen' },
  clipboard: { set: 'feather', name: 'clipboard' },
  target: { set: 'feather', name: 'target' },
  monitor: { set: 'feather', name: 'monitor' },
  // Health / fitness
  heart: { set: 'feather', name: 'heart' },
  dumbbell: { set: 'material', name: 'dumbbell' },
  run: { set: 'material', name: 'run' },
  bike: { set: 'material', name: 'bike' },
  yoga: { set: 'material', name: 'yoga' },
  meditation: { set: 'material', name: 'meditation' },
  spa: { set: 'material', name: 'spa-outline' },
  moon: { set: 'feather', name: 'moon' },
  // Food / drink
  coffee: { set: 'feather', name: 'coffee' },
  'food-apple': { set: 'material', name: 'food-apple-outline' },
  'glass-mug': { set: 'material', name: 'glass-mug-variant' },
  cup: { set: 'material', name: 'cup-water' },
  utensils: { set: 'material', name: 'silverware-fork-knife' },
  // Home / chores
  home: { set: 'feather', name: 'home' },
  'washing-machine': { set: 'material', name: 'washing-machine' },
  broom: { set: 'material', name: 'broom' },
  tools: { set: 'material', name: 'tools' },
  // Learning / hobbies
  book: { set: 'feather', name: 'book' },
  pencil: { set: 'material', name: 'pencil' },
  palette: { set: 'material', name: 'palette-outline' },
  camera: { set: 'feather', name: 'camera' },
  headphones: { set: 'feather', name: 'headphones' },
  music: { set: 'feather', name: 'music' },
  film: { set: 'feather', name: 'film' },
  gamepad: { set: 'material', name: 'gamepad-variant-outline' },
  // Travel
  plane: { set: 'feather', name: 'navigation' },
  car: { set: 'material', name: 'car' },
  train: { set: 'material', name: 'train' },
  bus: { set: 'material', name: 'bus' },
  map: { set: 'feather', name: 'map' },
  compass: { set: 'feather', name: 'compass' },
  globe: { set: 'feather', name: 'globe' },
  // Social / misc
  users: { set: 'feather', name: 'users' },
  'message-circle': { set: 'feather', name: 'message-circle' },
  phone: { set: 'feather', name: 'phone' },
  star: { set: 'feather', name: 'star' },
  bell: { set: 'feather', name: 'bell' },
  bookmark: { set: 'feather', name: 'bookmark' },
  clock: { set: 'feather', name: 'clock' },
  calendar: { set: 'feather', name: 'calendar' },
  award: { set: 'feather', name: 'award' },
  gift: { set: 'feather', name: 'gift' },
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
