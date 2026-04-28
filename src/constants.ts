export interface ThemePreset {
  id: string;
  name: string;
  brand: string;
  soft: string;
  bg: string;
  text: string;
}

export const THEMES: ThemePreset[] = [
  {
    id: 'pink',
    name: 'Soft Peony',
    brand: '#F472B6',
    soft: '#FDF2F8',
    bg: '#FAF7F2',
    text: '#4A4440'
  },
  {
    id: 'blue',
    name: 'Morning Mist',
    brand: '#60A5FA',
    soft: '#EFF6FF',
    bg: '#F8FAFC',
    text: '#334155'
  },
  {
    id: 'green',
    name: 'Sage Garden',
    brand: '#34D399',
    soft: '#ECFDF5',
    bg: '#F9FAF3',
    text: '#065F46'
  },
  {
    id: 'sunset',
    name: 'Warm Sunset',
    brand: '#FB923C',
    soft: '#FFF7ED',
    bg: '#FFFBF7',
    text: '#7C2D12'
  },
  {
    id: 'minimal',
    name: 'Pure Neutral',
    brand: '#9CA3AF',
    soft: '#F3F4F6',
    bg: '#FFFFFF',
    text: '#111827'
  }
];
