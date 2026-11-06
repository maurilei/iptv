import { dbManager } from '../db/database';
import { ParseProgress, ProgressCallback } from './m3uParser';

export interface XtreamUserInfo {
  username: string;
  password: string;
  message?: string;
  auth: number;
  status: string;
  exp_date: string | null;
  is_trial: string;
  active_cons: string | number;
  max_connections: string | number;
  allowed_output_formats: string[];
}

export interface XtreamServerInfo {
  url: string;
  port: string;
  https_port: string;
  server_protocol: string;
  rtmp_port: string;
  timezone: string;
}

export interface XtreamAuthResponse {
  user_info: XtreamUserInfo;
  server_info: XtreamServerInfo;
}

export class XtreamClient {
  private static cleanUrl(rawUrl: string): string {
    let url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    // Remove barras no final
    return url.replace(/\/+$/, '');
  }

  public static async authenticate(
    serverUrl: string,
    username: string,
    password: string,
    userAgent?: string
  ): Promise<XtreamAuthResponse> {
    const base = this.cleanUrl(serverUrl);
    const endpoint = `${base}/player_api.php?username=${encodeURIComponent(
      username
    )}&password=${encodeURIComponent(password)}`;

    console.log(`[Xtream] Conectando em ${base}...`);

    const headers: Record<string, string> = {
      'User-Agent': userAgent || 'IPTVSmarters/1.0.0 (Linux; Android TV)',
      Accept: 'application/json',
    };

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Erro na conexão com servidor Xtream: HTTP ${response.status}`);
    }

    const data: XtreamAuthResponse = await response.json();

    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error(
        data.user_info?.message || 'Falha na autenticação Xtream: Usuário ou senha incorretos.'
      );
    }

    return data;
  }

  public static async syncAndImport(
    playlistId: string,
    serverUrl: string,
    username: string,
    password: string,
    userAgent?: string,
    onProgress?: ProgressCallback
  ): Promise<{ channels: number; movies: number; series: number }> {
    const base = this.cleanUrl(serverUrl);
    const authData = await this.authenticate(base, username, password, userAgent);

    onProgress?.({
      importedCount: 0,
      totalEstimated: 100,
      currentGroup: 'Autenticado',
      percent: 5,
      message: `Conectado com sucesso! Usuário: ${authData.user_info.username} (Validade: ${
        authData.user_info.exp_date
          ? new Date(parseInt(authData.user_info.exp_date, 10) * 1000).toLocaleDateString()
          : 'Ilimitada'
      })`,
    });

    // Limpa registros anteriores desta playlist
    await dbManager.clearPlaylistChannels(playlistId);

    const headers: Record<string, string> = {
      'User-Agent': userAgent || 'IPTVSmarters/1.0.0 (Linux; Android TV)',
      Accept: 'application/json',
    };

    // 1. IMPORTAR CATEGORIAS E CANAIS AO VIVO
    onProgress?.({
      importedCount: 0,
      totalEstimated: 100,
      currentGroup: 'Canais Ao Vivo',
      percent: 15,
      message: 'Baixando categorias e canais ao vivo...',
    });

    // Categorias Ao Vivo
    const catUrl = `${base}/player_api.php?username=${encodeURIComponent(
      username
    )}&password=${encodeURIComponent(password)}&action=get_live_categories`;
    const catRes = await fetch(catUrl, { headers });
    const liveCategories: Array<{ category_id: string; category_name: string }> = await catRes.json();

    const categoryMap = new Map<string, string>();
    const formattedCategories: Array<{ id: string; name: string; stream_type: 'live' | 'movie' | 'series' }> = [];

    if (Array.isArray(liveCategories)) {
      for (const c of liveCategories) {
        categoryMap.set(String(c.category_id), c.category_name);
        formattedCategories.push({
          id: String(c.category_id),
          name: c.category_name,
          stream_type: 'live',
        });
      }
      await dbManager.insertCategoriesBatch(playlistId, formattedCategories);
    }

    // Streams Ao Vivo
    const liveStreamsUrl = `${base}/player_api.php?username=${encodeURIComponent(
      username
    )}&password=${encodeURIComponent(password)}&action=get_live_streams`;
    const liveStreamsRes = await fetch(liveStreamsUrl, { headers });
    const liveStreams: any[] = await liveStreamsRes.json();

    let totalChannels = 0;
    if (Array.isArray(liveStreams)) {
      const channelBatch: any[] = [];

      for (let i = 0; i < liveStreams.length; i++) {
        const item = liveStreams[i];
        const groupName = categoryMap.get(String(item.category_id)) || 'Geral';
        const streamUrl = `${base}/live/${encodeURIComponent(username)}/${encodeURIComponent(
          password
        )}/${item.stream_id}.ts`;

        channelBatch.push({
          id: `${playlistId}_live_${item.stream_id}`,
          stream_id: String(item.stream_id),
          name: item.name || `Canal ${item.stream_id}`,
          stream_url: streamUrl,
          logo_url: item.stream_icon || null,
          group_title: groupName,
          category_id: String(item.category_id),
          epg_channel_id: item.epg_channel_id || null,
          stream_type: 'live',
          channel_number: item.num || i + 1,
          container_extension: 'ts',
        });

        totalChannels++;

        // Insere em lotes de 300 canais
        if (channelBatch.length >= 300) {
          const batch = [...channelBatch];
          channelBatch.length = 0;
          await dbManager.insertChannelsChunk(playlistId, batch);

          onProgress?.({
            importedCount: totalChannels,
            totalEstimated: liveStreams.length,
            currentGroup: groupName,
            percent: Math.min(85, 20 + Math.round((totalChannels / liveStreams.length) * 60)),
            message: `Carregando canal ${totalChannels} de ${liveStreams.length}... (${groupName})`,
          });

          await new Promise((r) => setTimeout(r, 0));
        }
      }

      if (channelBatch.length > 0) {
        await dbManager.insertChannelsChunk(playlistId, channelBatch);
      }
    }

    // 2. ATUALIZAR ESTATÍSTICAS
    const accountInfoJson = JSON.stringify({
      username: authData.user_info.username,
      status: authData.user_info.status,
      exp_date: authData.user_info.exp_date,
      max_connections: authData.user_info.max_connections,
      active_cons: authData.user_info.active_cons,
    });

    await dbManager.updatePlaylistStats(
      playlistId,
      totalChannels,
      0,
      0,
      accountInfoJson
    );

    onProgress?.({
      importedCount: totalChannels,
      totalEstimated: totalChannels,
      currentGroup: 'Finalizado',
      percent: 100,
      message: `Xtream Codes sincronizado! ${totalChannels} canais prontos no banco SQLite.`,
    });

    return {
      channels: totalChannels,
      movies: 0,
      series: 0,
    };
  }
}

