export type PlaylistType = 'm3u_url' | 'm3u_file' | 'xtream';

export interface PlaylistConfig {
  id: string;
  name: string;
  type: PlaylistType;
  url?: string;
  serverUrl?: string;
  username?: string;
  password?: string;
  userAgent?: string;
  isActive: boolean;
  autoUpdateHours?: number;
  lastUpdated?: number;
}

export interface ChannelItem {
  id: string;
  playlistId: string;
  streamId?: string | number;
  name: string;
  streamUrl: string;
  logoUrl?: string;
  groupTitle: string;
  epgChannelId?: string;
  streamType: 'live' | 'movie' | 'series';
  channelNumber?: number;
  isFavorite?: boolean;
  orderIndex?: number;
}

export interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  startTime: number;
  endTime: number;
}

export interface XtreamAccountInfo {
  username: string;
  status: string;
  expDate: string;
  isTrial: boolean;
  activeCons: number;
  maxCons: number;
  allowedOutputFormats: string[];
}

