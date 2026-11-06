import { open, DB, QueryResult, Scalar } from '@op-engineering/op-sqlite';
import { CREATE_TABLES_SQL } from './schema';

export interface PlaylistRow {
  id: string;
  name: string;
  type: 'm3u_url' | 'm3u_file' | 'xtream';
  url: string | null;
  server_url: string | null;
  username: string | null;
  password: string | null;
  user_agent: string | null;
  is_active: number;
  auto_update_hours: number;
  last_updated: number | null;
  channel_count: number;
  movie_count: number;
  series_count: number;
  account_info: string | null;
  created_at: number;
}

export interface CategoryRow {
  id: string;
  playlist_id: string;
  category_id: string;
  name: string;
  stream_type: 'live' | 'movie' | 'series';
  order_index: number;
  is_hidden: number;
}

export interface ChannelRow {
  id: string;
  playlist_id: string;
  stream_id: string | null;
  name: string;
  stream_url: string;
  logo_url: string | null;
  group_title: string;
  category_id: string | null;
  epg_channel_id: string | null;
  stream_type: 'live' | 'movie' | 'series';
  channel_number: number | null;
  is_favorite: number;
  order_index: number;
  container_extension: string | null;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private db: DB | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.db = open({ name: 'iptv_database.db' });
        
        // Timeout de espera para evitar colisão de lock
        await this.db.execute('PRAGMA busy_timeout = 5000;');
        // WAL (Write-Ahead Logging) para máxima performance de leitura/escrita simultânea
        await this.db.execute('PRAGMA journal_mode = WAL;');
        await this.db.execute('PRAGMA synchronous = NORMAL;');
        await this.db.execute('PRAGMA foreign_keys = ON;');

        // Criação atômica das tabelas
        const statements = CREATE_TABLES_SQL.split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const sql of statements) {
          await this.db.execute(sql);
        }

        this.isInitialized = true;
        console.log('[DB] Banco de dados SQLite inicializado com sucesso.');
      } catch (error) {
        console.error('[DB] Erro ao inicializar banco de dados SQLite:', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  public getDb(): DB {
    if (!this.db) {
      this.db = open({ name: 'iptv_database.db' });
    }
    return this.db;
  }

  // --- PLAYLISTS ---

  public async getPlaylists(): Promise<PlaylistRow[]> {
    const db = this.getDb();
    const res = await db.execute('SELECT * FROM playlists ORDER BY is_active DESC, created_at DESC');
    return (res.rows || []) as unknown as PlaylistRow[];
  }

  public async getActivePlaylist(): Promise<PlaylistRow | null> {
    const db = this.getDb();
    const res = await db.execute('SELECT * FROM playlists WHERE is_active = 1 LIMIT 1');
    if (res.rows && res.rows.length > 0) {
      return res.rows[0] as unknown as PlaylistRow;
    }
    return null;
  }

  public async insertPlaylist(playlist: {
    id: string;
    name: string;
    type: 'm3u_url' | 'm3u_file' | 'xtream';
    url?: string;
    server_url?: string;
    username?: string;
    password?: string;
    user_agent?: string;
    is_active?: number;
    auto_update_hours?: number;
    account_info?: string;
  }): Promise<void> {
    const db = this.getDb();
    
    // Se for marcada como ativa, desativa as outras
    if (playlist.is_active) {
      await db.execute('UPDATE playlists SET is_active = 0');
    }

    await db.execute(
      `INSERT INTO playlists (
        id, name, type, url, server_url, username, password, user_agent,
        is_active, auto_update_hours, last_updated, channel_count, movie_count, series_count, account_info, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
      [
        playlist.id,
        playlist.name,
        playlist.type,
        playlist.url || null,
        playlist.server_url || null,
        playlist.username || null,
        playlist.password || null,
        playlist.user_agent || null,
        playlist.is_active ? 1 : 0,
        playlist.auto_update_hours || 24,
        Date.now(),
        playlist.account_info || null,
        Date.now(),
      ]
    );
  }

  public async setActivePlaylist(playlistId: string): Promise<void> {
    const db = this.getDb();
    await db.execute('UPDATE playlists SET is_active = 0');
    await db.execute('UPDATE playlists SET is_active = 1 WHERE id = ?', [playlistId]);
  }

  public async deletePlaylist(playlistId: string): Promise<void> {
    const db = this.getDb();
    await db.execute('DELETE FROM channels WHERE playlist_id = ?', [playlistId]);
    await db.execute('DELETE FROM categories WHERE playlist_id = ?', [playlistId]);
    await db.execute('DELETE FROM epg_programs WHERE playlist_id = ?', [playlistId]);
    await db.execute('DELETE FROM playlists WHERE id = ?', [playlistId]);

    // Se a deletada era ativa, ativa a primeira restante
    const active = await this.getActivePlaylist();
    if (!active) {
      const remaining = await this.getPlaylists();
      if (remaining.length > 0) {
        await this.setActivePlaylist(remaining[0].id);
      }
    }
  }

  public async updatePlaylistStats(
    playlistId: string,
    channels: number,
    movies: number,
    series: number,
    accountInfo?: string
  ): Promise<void> {
    const db = this.getDb();
    await db.execute(
      `UPDATE playlists SET 
        channel_count = ?, 
        movie_count = ?, 
        series_count = ?, 
        account_info = COALESCE(?, account_info),
        last_updated = ? 
      WHERE id = ?`,
      [channels, movies, series, accountInfo || null, Date.now(), playlistId]
    );
  }

  // --- CATEGORIES ---

  public async insertCategoriesBatch(
    playlistId: string,
    categories: Array<{ id: string; name: string; stream_type: 'live' | 'movie' | 'series' }>
  ): Promise<void> {
    if (categories.length === 0) return;
    const db = this.getDb();

    // Executa em transação única de alta velocidade
    await db.transaction(async (tx) => {
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        await tx.execute(
          `INSERT OR REPLACE INTO categories (
            id, playlist_id, category_id, name, stream_type, order_index, is_hidden
          ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [
            `${playlistId}_${cat.id}`,
            playlistId,
            cat.id,
            cat.name,
            cat.stream_type,
            i,
          ]
        );
      }
    });
  }

  public async getCategories(
    playlistId: string,
    streamType: 'live' | 'movie' | 'series'
  ): Promise<CategoryRow[]> {
    const db = this.getDb();
    const res = await db.execute(
      'SELECT * FROM categories WHERE playlist_id = ? AND stream_type = ? AND is_hidden = 0 ORDER BY order_index ASC',
      [playlistId, streamType]
    );
    return (res.rows || []) as unknown as CategoryRow[];
  }

  // --- CHANNELS (STREAMING BATCH) ---

  public async insertChannelsChunk(
    playlistId: string,
    channels: Array<{
      id: string;
      stream_id?: string | null;
      name: string;
      stream_url: string;
      logo_url?: string | null;
      group_title: string;
      category_id?: string | null;
      epg_channel_id?: string | null;
      stream_type: 'live' | 'movie' | 'series';
      channel_number?: number | null;
      container_extension?: string | null;
    }>
  ): Promise<void> {
    if (channels.length === 0) return;
    const db = this.getDb();

    await db.transaction(async (tx) => {
      for (let i = 0; i < channels.length; i++) {
        const ch = channels[i];
        await tx.execute(
          `INSERT OR REPLACE INTO channels (
            id, playlist_id, stream_id, name, stream_url, logo_url,
            group_title, category_id, epg_channel_id, stream_type, channel_number, is_favorite, order_index, container_extension
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [
            ch.id,
            playlistId,
            ch.stream_id || null,
            ch.name,
            ch.stream_url,
            ch.logo_url || null,
            ch.group_title,
            ch.category_id || null,
            ch.epg_channel_id || null,
            ch.stream_type,
            ch.channel_number || null,
            i,
            ch.container_extension || null,
          ]
        );
      }
    });
  }

  public async clearPlaylistChannels(playlistId: string): Promise<void> {
    const db = this.getDb();
    await db.execute('DELETE FROM channels WHERE playlist_id = ?', [playlistId]);
    await db.execute('DELETE FROM categories WHERE playlist_id = ?', [playlistId]);
  }

  public async getChannelsByCategory(
    playlistId: string,
    groupTitle: string,
    streamType: 'live' | 'movie' | 'series',
    limit = 200,
    offset = 0
  ): Promise<ChannelRow[]> {
    const db = this.getDb();
    let res: QueryResult;
    if (groupTitle === 'TODOS') {
      res = await db.execute(
        'SELECT * FROM channels WHERE playlist_id = ? AND stream_type = ? ORDER BY order_index ASC LIMIT ? OFFSET ?',
        [playlistId, streamType, limit, offset]
      );
    } else {
      res = await db.execute(
        'SELECT * FROM channels WHERE playlist_id = ? AND stream_type = ? AND group_title = ? ORDER BY order_index ASC LIMIT ? OFFSET ?',
        [playlistId, streamType, groupTitle, limit, offset]
      );
    }
    return (res.rows || []) as unknown as ChannelRow[];
  }

  public async getFavorites(playlistId: string): Promise<ChannelRow[]> {
    const db = this.getDb();
    const res = await db.execute(
      'SELECT * FROM channels WHERE playlist_id = ? AND is_favorite = 1 ORDER BY name ASC',
      [playlistId]
    );
    return (res.rows || []) as unknown as ChannelRow[];
  }

  public async toggleFavorite(channelId: string): Promise<boolean> {
    const db = this.getDb();
    const current = await db.execute('SELECT is_favorite FROM channels WHERE id = ?', [channelId]);
    if (!current.rows || current.rows.length === 0) return false;

    const newFav = current.rows[0].is_favorite === 1 ? 0 : 1;
    await db.execute('UPDATE channels SET is_favorite = ? WHERE id = ?', [newFav, channelId]);
    return newFav === 1;
  }

  public async searchChannels(playlistId: string, query: string, limit = 100): Promise<ChannelRow[]> {
    const db = this.getDb();
    const res = await db.execute(
      'SELECT * FROM channels WHERE playlist_id = ? AND name LIKE ? LIMIT ?',
      [playlistId, `%${query}%`, limit]
    );
    return (res.rows || []) as unknown as ChannelRow[];
  }
}

export const dbManager = DatabaseManager.getInstance();

