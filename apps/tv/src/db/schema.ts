export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'm3u_url', 'm3u_file', 'xtream'
  url TEXT,
  server_url TEXT,
  username TEXT,
  password TEXT,
  user_agent TEXT,
  is_active INTEGER DEFAULT 0,
  auto_update_hours INTEGER DEFAULT 24,
  last_updated INTEGER,
  channel_count INTEGER DEFAULT 0,
  movie_count INTEGER DEFAULT 0,
  series_count INTEGER DEFAULT 0,
  account_info TEXT, -- JSON com exp_date, status, max_connections
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  stream_type TEXT NOT NULL, -- 'live', 'movie', 'series'
  order_index INTEGER DEFAULT 0,
  is_hidden INTEGER DEFAULT 0,
  FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL,
  stream_id TEXT,
  name TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  logo_url TEXT,
  group_title TEXT NOT NULL,
  category_id TEXT,
  epg_channel_id TEXT,
  stream_type TEXT NOT NULL, -- 'live', 'movie', 'series'
  channel_number INTEGER,
  is_favorite INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  container_extension TEXT,
  FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS epg_programs (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  epg_channel_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE
);

-- Índices de alta velocidade para busca e listagem instantânea
CREATE INDEX IF NOT EXISTS idx_playlists_active ON playlists (is_active);
CREATE INDEX IF NOT EXISTS idx_categories_lookup ON categories (playlist_id, stream_type, is_hidden);
CREATE INDEX IF NOT EXISTS idx_channels_lookup ON channels (playlist_id, stream_type, group_title);
CREATE INDEX IF NOT EXISTS idx_channels_favorites ON channels (playlist_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_channels_search ON channels (playlist_id, name);
CREATE INDEX IF NOT EXISTS idx_epg_lookup ON epg_programs (playlist_id, epg_channel_id, start_time);
`;

