/**
 * Preset categories and activities seeded on first launch.
 * These have is_preset = 1 and user_id = null (system-owned).
 */

export interface PresetCategory {
  name: string;
  color: string;
  icon: string;
  activities: string[];
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    name: 'Work',
    color: '#4A90D9',
    icon: 'briefcase',
    activities: ['Deep Work', 'Meetings', 'Email', 'Admin', 'Commute'],
  },
  {
    name: 'Health & Fitness',
    color: '#E74C3C',
    icon: 'heart',
    activities: ['Exercise', 'Stretching', 'Walking', 'Sports'],
  },
  {
    name: 'Sleep',
    color: '#8E44AD',
    icon: 'moon',
    activities: ['Night Sleep', 'Nap'],
  },
  {
    name: 'Meals',
    color: '#F39C12',
    icon: 'utensils',
    activities: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Cooking'],
  },
  {
    name: 'Social',
    color: '#E91E63',
    icon: 'users',
    activities: ['Friends', 'Family', 'Phone Calls', 'Messaging'],
  },
  {
    name: 'Learning',
    color: '#2ECC71',
    icon: 'book',
    activities: ['Reading', 'Online Course', 'Studying', 'Practice'],
  },
  {
    name: 'Entertainment',
    color: '#9B59B6',
    icon: 'gamepad',
    activities: ['TV / Movies', 'Gaming', 'Social Media', 'Music'],
  },
  {
    name: 'Personal Care',
    color: '#1ABC9C',
    icon: 'spa',
    activities: ['Hygiene', 'Meditation', 'Journaling', 'Therapy'],
  },
  {
    name: 'Chores',
    color: '#95A5A6',
    icon: 'home',
    activities: ['Cleaning', 'Laundry', 'Groceries', 'Errands', 'Repairs'],
  },
  {
    name: 'Travel',
    color: '#3498DB',
    icon: 'plane',
    activities: ['Driving', 'Public Transit', 'Walking', 'Flying'],
  },
];
