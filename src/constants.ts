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
    id: 'burgundy',
    name: 'Cyber Burgundy',
    brand: '#C1121F',
    soft: '#2B0508',
    bg: '#0A0102',
    text: '#FDF0F0',
    gradient: 'radial-gradient(circle at 0% 0%, rgba(193, 18, 31, 0.15) 0%, transparent 40%), radial-gradient(circle at 100% 100%, rgba(120, 0, 0, 0.1) 0%, transparent 40%)'
  },
  {
    id: 'cyber',
    name: 'Cyber Neon',
    brand: '#FF006E',
    soft: '#FFF0F6',
    bg: '#FFFFFF',
    text: '#0D0D0D',
    gradient: 'radial-gradient(circle at 0% 0%, rgba(255, 0, 110, 0.05) 0%, transparent 40%), radial-gradient(circle at 100% 100%, rgba(0, 245, 255, 0.05) 0%, transparent 40%)'
  },
  {
    id: 'midnight',
    name: 'Midnight Velvet',
    brand: '#7B2CBF',
    soft: '#F3E8FF',
    bg: '#050505',
    text: '#F5F5F5',
    gradient: 'radial-gradient(circle at 10% 20%, rgba(123, 44, 191, 0.1) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(60, 9, 108, 0.1) 0%, transparent 40%)'
  },
  {
    id: 'chrome',
    name: 'Liquid Chrome',
    brand: '#00F5FF',
    soft: '#E0FDFF',
    bg: '#F8FAFC',
    text: '#0F172A',
    gradient: 'radial-gradient(circle at 10% 20%, rgba(0, 245, 255, 0.05) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(58, 134, 255, 0.05) 0%, transparent 40%)'
  },
  {
    id: 'sunset',
    name: 'Lofi Sunset',
    brand: '#FB5607',
    soft: '#FFF0E6',
    bg: '#FFFBF7',
    text: '#432818',
    gradient: 'radial-gradient(circle at 10% 20%, rgba(251, 86, 7, 0.05) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(255, 190, 11, 0.05) 0%, transparent 40%)'
  },
  {
    id: 'glitch',
    name: 'Glitch Core',
    brand: '#3A86FF',
    soft: '#EBF2FF',
    bg: '#FFFFFF',
    text: '#0D0D0D',
    gradient: 'radial-gradient(circle at 10% 20%, rgba(58, 134, 255, 0.05) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(255, 0, 110, 0.05) 0%, transparent 40%)'
  }
];
