import { dbManager } from '../db/database';

export interface ParseProgress {
  importedCount: number;
  totalEstimated: number;
  currentGroup: string;
  percent: number;
  message: string;
}

export type ProgressCallback = (progress: ParseProgress) => void;

interface ParsedItem {
  id: string;
  name: string;
  stream_url: string;
  logo_url: string | null;
  group_title: string;
  epg_channel_id: string | null;
  stream_type: 'live' | 'movie' | 'series';
  channel_number: number | null;
}

export class M3UStreamingParser {
  private static readonly BATCH_SIZE = 400; // Inserções por tick do event-loop

  public static async parseAndImport(
    playlistId: string,
    rawText: string,
    onProgress?: ProgressCallback
  ): Promise<{ channels: number; movies: number; series: number }> {
    console.log(`[M3UParser] Iniciando parse em streaming para playlist ${playlistId}...`);
    
    // Limpa registros anteriores desta playlist
    await dbManager.clearPlaylistChannels(playlistId);

    const length = rawText.length;
    let pos = 0;
    let lineStart = 0;

    let currentMetadata: {
      name: string;
      logo: string | null;
      group: string;
      epgId: string | null;
      chno: number | null;
    } | null = null;

    const channelBatch: ParsedItem[] = [];
    const categoriesMap = new Map<string, { id: string; name: string; stream_type: 'live' | 'movie' | 'series' }>();

    let totalChannels = 0;
    let totalMovies = 0;
    let totalSeries = 0;
    let totalImported = 0;

    // Estimativa grosseira de linhas baseada no tamanho do arquivo (média de 150 caracteres por linha)
    const estimatedTotalLines = Math.max(100, Math.floor(length / 150));
    const estimatedTotalItems = Math.floor(estimatedTotalLines / 2);

    const tvgIdRegex = /tvg-id="([^"]*)"/i;
    const tvgNameRegex = /tvg-name="([^"]*)"/i;
    const tvgLogoRegex = /tvg-logo="([^"]*)"/i;
    const groupTitleRegex = /group-title="([^"]*)"/i;
    const tvgChnoRegex = /tvg-chno="([^"]*)"/i;

    while (pos < length) {
      // Encontra a próxima quebra de linha sem alocar array de 50.000 strings
      let lineEnd = rawText.indexOf('\n', pos);
      if (lineEnd === -1) {
        lineEnd = length;
      }

      let line = rawText.substring(lineStart, lineEnd).trim();
      pos = lineEnd + 1;
      lineStart = pos;

      if (!line) continue;

      if (line.startsWith('#EXTINF:')) {
        // Extrai metadados da linha #EXTINF
        const tvgIdMatch = line.match(tvgIdRegex);
        const tvgNameMatch = line.match(tvgNameRegex);
        const tvgLogoMatch = line.match(tvgLogoRegex);
        const groupMatch = line.match(groupTitleRegex);
        const chnoMatch = line.match(tvgChnoRegex);

        // O nome do canal fica após a última vírgula da linha #EXTINF
        const commaIndex = line.lastIndexOf(',');
        let channelName = '';
        if (commaIndex !== -1 && commaIndex < line.length - 1) {
          channelName = line.substring(commaIndex + 1).trim();
        } else if (tvgNameMatch && tvgNameMatch[1]) {
          channelName = tvgNameMatch[1].trim();
        } else {
          channelName = 'Sem Nome';
        }

        const groupTitle = groupMatch && groupMatch[1] ? groupMatch[1].trim() : 'Geral';
        const logoUrl = tvgLogoMatch && tvgLogoMatch[1] ? tvgLogoMatch[1].trim() : null;
        const epgId = tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1].trim() : null;
        const chno = chnoMatch && chnoMatch[1] ? parseInt(chnoMatch[1], 10) : null;

        currentMetadata = {
          name: channelName,
          logo: logoUrl,
          group: groupTitle,
          epgId: epgId,
          chno: isNaN(chno as number) ? null : chno,
        };
      } else if (!line.startsWith('#') && currentMetadata) {
        // Linha com a URL da stream
        const streamUrl = line;
        const groupLower = currentMetadata.group.toLowerCase();
        const urlLower = streamUrl.toLowerCase();

        // Detecção inteligente de tipo de mídia
        let streamType: 'live' | 'movie' | 'series' = 'live';

        if (
          urlLower.includes('/series/') ||
          groupLower.includes('série') ||
          groupLower.includes('series') ||
          groupLower.includes('temporada') ||
          groupLower.includes('season')
        ) {
          streamType = 'series';
          totalSeries++;
        } else if (
          urlLower.includes('/movie/') ||
          urlLower.endsWith('.mp4') ||
          urlLower.endsWith('.mkv') ||
          urlLower.endsWith('.avi') ||
          groupLower.includes('filme') ||
          groupLower.includes('movie') ||
          groupLower.includes('cinema') ||
          groupLower.includes('vod')
        ) {
          streamType = 'movie';
          totalMovies++;
        } else {
          streamType = 'live';
          totalChannels++;
        }

        // Armazena categoria única
        const catKey = `${currentMetadata.group}_${streamType}`;
        if (!categoriesMap.has(catKey)) {
          categoriesMap.set(catKey, {
            id: currentMetadata.group,
            name: currentMetadata.group,
            stream_type: streamType,
          });
        }

        channelBatch.push({
          id: `${playlistId}_${totalImported}`,
          name: currentMetadata.name,
          stream_url: streamUrl,
          logo_url: currentMetadata.logo,
          group_title: currentMetadata.group,
          epg_channel_id: currentMetadata.epgId,
          stream_type: streamType,
          channel_number: currentMetadata.chno || totalImported + 1,
        });

        totalImported++;
        currentMetadata = null;

        // Quando o lote atinge BATCH_SIZE, descarrega no SQLite e cede o event-loop
        if (channelBatch.length >= M3UStreamingParser.BATCH_SIZE) {
          const batchToInsert = [...channelBatch];
          channelBatch.length = 0; // Esvazia o buffer

          await dbManager.insertChannelsChunk(playlistId, batchToInsert);

          if (onProgress) {
            const pct = Math.min(99, Math.round((totalImported / (estimatedTotalItems || 1)) * 100));
            onProgress({
              importedCount: totalImported,
              totalEstimated: Math.max(totalImported, estimatedTotalItems),
              currentGroup: batchToInsert[batchToInsert.length - 1].group_title,
              percent: pct,
              message: `Importando canal ${totalImported}... (${batchToInsert[batchToInsert.length - 1].group_title})`,
            });
          }

          // Cede a CPU para que a interface continue a 60fps sem congelar
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }

    // Grava o restante que sobrou no buffer
    if (channelBatch.length > 0) {
      await dbManager.insertChannelsChunk(playlistId, channelBatch);
    }

    // Salva as categorias agrupadas
    const allCategories = Array.from(categoriesMap.values());
    await dbManager.insertCategoriesBatch(playlistId, allCategories);

    // Atualiza as estatísticas finais da playlist
    await dbManager.updatePlaylistStats(
      playlistId,
      totalChannels,
      totalMovies,
      totalSeries
    );

    if (onProgress) {
      onProgress({
        importedCount: totalImported,
        totalEstimated: totalImported,
        currentGroup: 'Concluído',
        percent: 100,
        message: `Importação concluída! ${totalImported} canais carregados no SQLite.`,
      });
    }

    console.log(
      `[M3UParser] Concluído com sucesso! Total: ${totalImported} (Ao vivo: ${totalChannels}, Filmes: ${totalMovies}, Séries: ${totalSeries})`
    );

    return {
      channels: totalChannels,
      movies: totalMovies,
      series: totalSeries,
    };
  }
}

