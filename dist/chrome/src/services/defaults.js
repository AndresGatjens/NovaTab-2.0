import { uid } from '../utils/id.js';

/** Valores por defecto del estado global de la extensión. */

export const DEFAULT_SETTINGS = {
  version: 1,
  language: 'es', // 'es' | 'en'
  searchEngine: 'google',
  customSearchUrl: '',
  linkBehavior: 'current', // 'current' | 'new'
  theme: 'auto', // 'light' | 'dark' | 'auto'
  accent: 'violet', // color de tema de la interfaz (ACCENTS) | 'custom'
  accentCustom: null, // { a, a2, a3 } cuando accent === 'custom'
  background: {
    type: 'gradient', // 'color' | 'gradient' | 'image'
    color: '#1e293b',
    gradient: {
      from: '#4f46e5',
      to: '#0f172a',
      angle: 135,
    },
    image: '', // URL o dataURL de imagen de fondo
  },
  transparency: 0.9, // 0..1 opacidad de tarjetas
  blur: 8, // px de desenfoque de tarjetas
  iconSize: 52, // px
  gridColumns: 5,
  gridRows: 4,
  gridSpacing: 16,
  cardRadius: 16,
  showLabels: true,
  showFavicons: true,
  animations: true,
};

export const DEFAULT_BOOKMARKS = [
  { id: uid('bm'), title: 'YouTube', url: 'https://youtube.com', icon: '', folderId: null, position: 0 },
  { id: uid('bm'), title: 'GitHub', url: 'https://github.com', icon: '', folderId: null, position: 1 },
  { id: uid('bm'), title: 'Gmail', url: 'https://mail.google.com', icon: '', folderId: null, position: 2 },
  { id: uid('bm'), title: 'ChatGPT', url: 'https://chatgpt.com', icon: '', folderId: null, position: 3 },
  { id: uid('bm'), title: 'WhatsApp Web', url: 'https://web.whatsapp.com', icon: '', folderId: null, position: 4 },
];

export const DEFAULT_FOLDERS = [
  {
    id: uid('fld'),
    title: 'Trabajo',
    icon: 'work',
    position: 0,
    parentId: null,
    bookmarks: [], // referencias de búsqueda rápida; fuente real: marcadores con folderId
  },
  {
    id: uid('fld'),
    title: 'Entretenimiento',
    icon: 'play',
    position: 1,
    parentId: null,
    bookmarks: [],
  },
];

export const DEFAULT_WIDGETS = [
  { id: uid('wdg'), type: 'clock', position: 0, enabled: true, config: { format: '12h' } },
  { id: uid('wdg'), type: 'date', position: 1, enabled: true, config: { locale: 'es' } },
  { id: uid('wdg'), type: 'weather', position: 2, enabled: false, config: { location: '', units: 'metric' } },
  { id: uid('wdg'), type: 'calendar', position: 3, enabled: true, config: { locale: 'es' } },
  { id: uid('wdg'), type: 'notes', position: 4, enabled: false, config: { text: '' } },
];

export function defaultState() {
  return {
    settings: structuredClone(DEFAULT_SETTINGS),
    folders: structuredClone(DEFAULT_FOLDERS),
    bookmarks: structuredClone(DEFAULT_BOOKMARKS),
    widgets: structuredClone(DEFAULT_WIDGETS),
    gridOrder: [],
  };
}