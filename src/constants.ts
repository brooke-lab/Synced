export interface ThemePreset {
  id: string;
  name: string;
  brand: string;
  soft: string;
  bg: string;
  text: string;
  gradient: string;
}

export const THEMES: ThemePreset[] = [
  {
    id: 'pink',
    name: 'Soft Peony',
    brand: '#F472B6',
    soft: '#FDF2F8',
    bg: '#FAF7F2',
    text: '#4A4440',
    gradient: 'radial-gradient(circle at 10% 20%, #FDF2F8 0%, transparent 40%), radial-gradient(circle at 90% 80%, #F5F7FF 0%, transparent 40%)'
  },
  {
    id: 'blue',
    name: 'Morning Mist',
    brand: '#60A5FA',
    soft: '#EFF6FF',
    bg: '#F8FAFC',
    text: '#334155',
    gradient: 'radial-gradient(circle at 10% 20%, #EFF6FF 0%, transparent 40%), radial-gradient(circle at 90% 80%, #F1F5F9 0%, transparent 40%)'
  },
  {
    id: 'green',
    name: 'Sage Garden',
    brand: '#10B981',
    soft: '#ECFDF5',
    bg: '#F9FAF3',
    text: '#064E3B',
    gradient: 'radial-gradient(circle at 10% 20%, #ECFDF5 0%, transparent 40%), radial-gradient(circle at 90% 80%, #F0FDF4 0%, transparent 40%)'
  },
  {
    id: 'sunset',
    name: 'Warm Sunset',
    brand: '#FB923C',
    soft: '#FFF7ED',
    bg: '#FFFBF7',
    text: '#7C2D12',
    gradient: 'radial-gradient(circle at 10% 20%, #FFF7ED 0%, transparent 40%), radial-gradient(circle at 90% 80%, #FFF1F2 0%, transparent 40%)'
  },
  {
    id: 'minimal',
    name: 'Pure Neutral',
    brand: '#4B5563',
    soft: '#F3F4F6',
    bg: '#FFFFFF',
    text: '#111827',
    gradient: 'radial-gradient(circle at 10% 20%, #F9FAFB 0%, transparent 40%), radial-gradient(circle at 90% 80%, #F3F4F6 0%, transparent 40%)'
  }
];
