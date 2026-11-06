import { dbManager, PlaylistRow } from '../db/database';
import { M3UStreamingParser, ProgressCallback } from './m3uParser';
import { XtreamClient } from './xtreamClient';

export const DEMO_M3U_CONTENT = `#EXTM3U
#EXTINF:-1 tvg-id="tvbrasil.br" tvg-name="TV Brasil HD" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/TV_Brasil_logo_2019.svg/320px-TV_Brasil_logo_2019.svg.png" group-title="Canais Públicos",TV Brasil HD
https://tvbrasil.ebc.com.br/hls/tvbrasil/index.m3u8
#EXTINF:-1 tvg-id="tvcultura.br" tvg-name="TV Cultura HD" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/TV_Cultura_logo_2014.svg/320px-TV_Cultura_logo_2014.svg.png" group-title="Cultura & Educativo",TV Cultura HD
https://aovivo.cultura.com.br/hls/tvcultura/index.m3u8
#EXTINF:-1 tvg-id="tvsenado.br" tvg-name="TV Senado HD" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/TV_Senado_logo.svg/320px-TV_Senado_logo.svg.png" group-title="Canais Públicos",TV Senado HD
https://tvsenado-lh.akamaihd.net/i/tvsenado_1@181347/master.m3u8
#EXTINF:-1 tvg-id="tvcwb.br" tvg-name="TV Câmara HD" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/TV_C%C3%A2mara_logo.svg/320px-TV_C%C3%A2mara_logo.svg.png" group-title="Canais Públicos",TV Câmara HD
https://stream1.camara.leg.br/live/tvcamara.m3u8
#EXTINF:-1 tvg-id="redbull.tv" tvg-name="Red Bull TV HD" tvg-logo="https://resources.redbull.com/logos/redbulltv/logo.png" group-title="Esportes & Aventura",Red Bull TV HD
https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8
#EXTINF:-1 tvg-id="nasa.gov" tvg-name="NASA TV Public HD" tvg-logo="https://www.nasa.gov/sites/default/files/thumbnails/image/nasa-logo-web-rgb.png" group-title="Ciência & Espaço",NASA TV Public HD
https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8
#EXTINF:-1 tvg-id="bloomberg.us" tvg-name="Bloomberg TV HD" tvg-logo="https://assets.bwbx.io/s3/javelin/public/hub/images/favicon-black-63fe5249.png" group-title="Notícias",Bloomberg TV HD
https://liveproduseast.global.ssl.fastly.net/us/Channel-USTV-AWS-virginia-1/Source-USTV-1000-1_live.m3u8
#EXTINF:-1 tvg-id="aljazeera.en" tvg-name="Al Jazeera English HD" tvg-logo="https://www.aljazeera.com/favicon.ico" group-title="Notícias",Al Jazeera English HD
https://live-hls-web-aje.getaj.net/AJE/01.m3u8
#EXTINF:-1 tvg-id="vod.bbb" tvg-name="Big Buck Bunny (Filme 4K VOD)" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/320px-Big_buck_bunny_poster_big.jpg" group-title="Filmes VOD",Big Buck Bunny (Curta 4K)
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
#EXTINF:-1 tvg-id="vod.tos" tvg-name="Tears of Steel (Sci-Fi VOD)" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Tears_of_Steel_poster.jpg/320px-Tears_of_Steel_poster.jpg" group-title="Filmes VOD",Tears of Steel (Sci-Fi HD)
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4
#EXTINF:-1 tvg-id="vod.sintel" tvg-name="Sintel (Animação VOD)" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/320px-Sintel_poster.jpg" group-title="Filmes VOD",Sintel (Animação HD)
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4
#EXTINF:-1 tvg-id="series.cosmos.s01e01" tvg-name="Cosmos S01 E01 - Rumo às Estrelas" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Tears_of_Steel_poster.jpg/320px-Tears_of_Steel_poster.jpg" group-title="Séries Documentário",Cosmos S01 E01 - Rumo às Estrelas
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4
#EXTINF:-1 tvg-id="series.cosmos.s01e02" tvg-name="Cosmos S01 E02 - Mundos Distantes" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Tears_of_Steel_poster.jpg/320px-Tears_of_Steel_poster.jpg" group-title="Séries Documentário",Cosmos S01 E02 - Mundos Distantes
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4
#EXTINF:-1 tvg-id="series.open.s01e01" tvg-name="Open Source Cinema S01 E01 - O Despertar" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/320px-Sintel_poster.jpg" group-title="Séries de Ficção",Open Source Cinema S01 E01 - O Despertar
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
#EXTINF:-1 tvg-id="series.open.s01e02" tvg-name="Open Source Cinema S01 E02 - Em Chamas" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/320px-Sintel_poster.jpg" group-title="Séries de Ficção",Open Source Cinema S01 E02 - Em Chamas
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4
`;

export class PlaylistManager {
  public static async addDemoPlaylist(onProgress?: ProgressCallback): Promise<PlaylistRow> {
    const id = `playlist_demo_${Date.now()}`;
    const name = 'Playlist Demonstração (Canais Abertos & VOD)';

    await dbManager.insertPlaylist({
      id,
      name,
      type: 'm3u_file',
      is_active: 1,
    });

    onProgress?.({
      importedCount: 0,
      totalEstimated: 11,
      currentGroup: 'Iniciando',
      percent: 10,
      message: 'Processando lista de demonstração...',
    });

    await M3UStreamingParser.parseAndImport(id, DEMO_M3U_CONTENT, onProgress);
    await dbManager.setActivePlaylist(id);

    const active = await dbManager.getActivePlaylist();
    return active!;
  }

  public static async addM3UUrlPlaylist(
    name: string,
    url: string,
    userAgent?: string,
    onProgress?: ProgressCallback
  ): Promise<PlaylistRow> {
    const id = `playlist_m3u_${Date.now()}`;

    onProgress?.({
      importedCount: 0,
      totalEstimated: 100,
      currentGroup: 'Download',
      percent: 5,
      message: 'Baixando playlist M3U da URL...',
    });

    const headers: Record<string, string> = {};
    if (userAgent) {
      headers['User-Agent'] = userAgent;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Falha no download da playlist M3U: HTTP ${response.status}`);
    }

    const rawText = await response.text();

    await dbManager.insertPlaylist({
      id,
      name,
      type: 'm3u_url',
      url,
      user_agent: userAgent,
      is_active: 1,
    });

    await M3UStreamingParser.parseAndImport(id, rawText, onProgress);
    await dbManager.setActivePlaylist(id);

    const active = await dbManager.getActivePlaylist();
    return active!;
  }

  public static async addXtreamPlaylist(
    name: string,
    serverUrl: string,
    username: string,
    password: string,
    userAgent?: string,
    onProgress?: ProgressCallback
  ): Promise<PlaylistRow> {
    const id = `playlist_xtream_${Date.now()}`;

    await dbManager.insertPlaylist({
      id,
      name,
      type: 'xtream',
      server_url: serverUrl,
      username,
      password,
      user_agent: userAgent,
      is_active: 1,
    });

    await XtreamClient.syncAndImport(id, serverUrl, username, password, userAgent, onProgress);
    await dbManager.setActivePlaylist(id);

    const active = await dbManager.getActivePlaylist();
    return active!;
  }

  public static async syncPlaylist(
    playlist: PlaylistRow,
    onProgress?: ProgressCallback
  ): Promise<void> {
    if (playlist.type === 'xtream' && playlist.server_url && playlist.username && playlist.password) {
      await XtreamClient.syncAndImport(
        playlist.id,
        playlist.server_url,
        playlist.username,
        playlist.password,
        playlist.user_agent || undefined,
        onProgress
      );
    } else if (playlist.type === 'm3u_url' && playlist.url) {
      const headers: Record<string, string> = {};
      if (playlist.user_agent) {
        headers['User-Agent'] = playlist.user_agent;
      }
      const response = await fetch(playlist.url, { headers });
      if (!response.ok) {
        throw new Error(`Falha ao sincronizar M3U: HTTP ${response.status}`);
      }
      const rawText = await response.text();
      await M3UStreamingParser.parseAndImport(playlist.id, rawText, onProgress);
    } else if (playlist.type === 'm3u_file') {
      // Reimporta a demo
      await M3UStreamingParser.parseAndImport(playlist.id, DEMO_M3U_CONTENT, onProgress);
    }
  }
}

