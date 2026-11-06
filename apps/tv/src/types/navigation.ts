export interface TVNavigationItem {
  id: string;
  title: string;
  icon: string;
  badge?: string | number;
}

export type ActiveSection = 
  | 'live'
  | 'movies'
  | 'series'
  | 'favorites'
  | 'search'
  | 'epg'
  | 'playlists'
  | 'settings';

