export interface Artwork {
  id: string;
  title: string;
  category: 'busts' | 'halfbodies' | 'fullbodies' | 'illustrations';  date: string;  image: string;
}

export const artworks: Artwork[] = [
  {
    id: '1',
    title: 'Ithil Illustration',
    category: 'illustrations',    date: 'August 16, 2026',    image: '/artwork-1.jpg',
  },
  {
    id: '2',
    title: 'Josephona',
    category: 'halfbodies',    date: 'November 23, 2024',    image: '/artwork-2.jpg',
  },
  {
    id: '3',
    title: 'Synea',
    category: 'fullbodies',    date: 'July 6, 2025',    image: '/artwork-3.jpg',
  },
  {
    id: '4',
    title: 'Sisu',
    category: 'illustrations',    date: 'April 30, 2025',    image: '/artwork-4.jpg',
  },
  {
    id: '5',
    title: 'Snowy Dragon',
    category: 'fullbodies',    date: 'September 26, 2025',    image: '/artwork-5.jpg',
  },
  {
    id: '6',
    title: 'Ithil Crash Landing Sticker',
    category: 'fullbodies',    date: 'February 5, 2026',    image: '/artwork-6.jpg',
  },
  {
    id: '7',
    title: 'Xantina Cat Stretch',
    category: 'fullbodies',    date: 'April 16, 2026',    image: '/artwork-7.jpg',
  },
  {
    id: '8',
    title: 'Xantina Cat Form',
    category: 'illustrations',    date: 'August 8, 2026',    image: '/artwork-8.jpg',
  },
];

export const categories = [
  { id: 'all', label: 'All Work' },
  { id: 'busts', label: 'Busts' },
  { id: 'halfbodies', label: 'Halfbodies' },
  { id: 'fullbodies', label: 'Fullbodies' },
  { id: 'illustrations', label: 'Illustrations' },
] as const;


