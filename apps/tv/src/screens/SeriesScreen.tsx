import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { dbManager, ChannelRow, CategoryRow, PlaylistRow } from '../db/database';
import { FocusableItem } from '../components/FocusableItem';
import { TVImage } from '../components/TVImage';
import { Modal } from '../components/Modal';

export interface EpisodeItem {
  channel: ChannelRow;
  season: number;
  episode: number;
  episodeTitle: string;
}

export interface SeriesGroup {
  id: string;
  name: string;
  category: string;
  logoUrl: string | null;
  seasons: { [seasonNum: number]: EpisodeItem[] };
  seasonNumbers: number[];
  totalEpisodes: number;
}

interface SeriesScreenProps {
  onPlayEpisode?: (episode: ChannelRow) => void;
  onNavigateToPlaylists?: () => void;
}

export const SeriesScreen: React.FC<SeriesScreenProps> = ({
  onPlayEpisode,
  onNavigateToPlaylists,
}) => {
  const [activePlaylist, setActivePlaylist] = useState<PlaylistRow | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [rawSeriesChannels, setRawSeriesChannels] = useState<ChannelRow[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<SeriesGroup | null>(null);
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [isEpisodesModalOpen, setIsEpisodesModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Parser inteligente para agrupar episódios soltos em Séries e Temporadas
  const groupedSeriesList: SeriesGroup[] = useMemo(() => {
    const seriesMap = new Map<string, SeriesGroup>();

    // Regex para identificar padrão: "Nome da Série S01 E02 - Titulo Episodio" ou "Nome 1x02"
    const standardRegex = /^(.*?)(?:[\s._-]+(?:S|T|Temporada|Season)[\s._-]*0*(\d+)[\s._-]*(?:E|EP|Episodio|Episode)[\s._-]*0*(\d+))(?:[\s._-]+(.*))?$/i;
    const shortRegex = /^(.*?)(?:[\s._-]+0*(\d+)[xX]0*(\d+))(?:[\s._-]+(.*))?$/i;

    rawSeriesChannels.forEach((ch, index) => {
      let seriesName = ch.group_title;
      let seasonNum = 1;
      let episodeNum = index + 1;
      let epTitle = ch.name;

      const stdMatch = ch.name.match(standardRegex);
      const shortMatch = ch.name.match(shortRegex);

      if (stdMatch) {
        seriesName = stdMatch[1].trim() || ch.group_title;
        seasonNum = parseInt(stdMatch[2], 10) || 1;
        episodeNum = parseInt(stdMatch[3], 10) || 1;
        epTitle = stdMatch[4] ? stdMatch[4].trim() : `Episódio ${episodeNum}`;
      } else if (shortMatch) {
        seriesName = shortMatch[1].trim() || ch.group_title;
        seasonNum = parseInt(shortMatch[2], 10) || 1;
        episodeNum = parseInt(shortMatch[3], 10) || 1;
        epTitle = shortMatch[4] ? shortMatch[4].trim() : `Episódio ${episodeNum}`;
      }

      const key = `${ch.playlist_id}_${seriesName.toLowerCase()}`;
      if (!seriesMap.has(key)) {
        seriesMap.set(key, {
          id: key,
          name: seriesName,
          category: ch.group_title,
          logoUrl: ch.logo_url,
          seasons: {},
          seasonNumbers: [],
          totalEpisodes: 0,
        });
      }

      const group = seriesMap.get(key)!;
      if (!group.seasons[seasonNum]) {
        group.seasons[seasonNum] = [];
        group.seasonNumbers.push(seasonNum);
        group.seasonNumbers.sort((a, b) => a - b);
      }

      group.seasons[seasonNum].push({
        channel: ch,
        season: seasonNum,
        episode: episodeNum,
        episodeTitle: epTitle,
      });

      // Ordena episódios numericamente
      group.seasons[seasonNum].sort((a, b) => a.episode - b.episode);
      group.totalEpisodes++;
    });

    return Array.from(seriesMap.values());
  }, [rawSeriesChannels]);

  // Filtra por categoria
  const filteredSeries = useMemo(() => {
    if (selectedCategory === 'TODOS') return groupedSeriesList;
    return groupedSeriesList.filter((s) => s.category === selectedCategory);
  }, [groupedSeriesList, selectedCategory]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await dbManager.init();
      const pl = await dbManager.getActivePlaylist();
      setActivePlaylist(pl);

      if (pl) {
        const cats = await dbManager.getCategories(pl.id, 'series');
        setCategories(cats);

        const list = await dbManager.getChannelsByCategory(
          pl.id,
          'TODOS',
          'series',
          500,
          0
        );
        setRawSeriesChannels(list);
      }
    } catch (e) {
      console.error('[SeriesScreen] Erro ao carregar séries:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Atualiza a série selecionada por padrão quando a lista carregar
  useEffect(() => {
    if (filteredSeries.length > 0 && !selectedSeries) {
      setSelectedSeries(filteredSeries[0]);
      if (filteredSeries[0].seasonNumbers.length > 0) {
        setActiveSeason(filteredSeries[0].seasonNumbers[0]);
      }
    }
  }, [filteredSeries, selectedSeries]);

  const openEpisodesModal = (series: SeriesGroup) => {
    setSelectedSeries(series);
    if (series.seasonNumbers.length > 0) {
      setActiveSeason(series.seasonNumbers[0]);
    }
    setIsEpisodesModalOpen(true);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Carregando catálogo de séries e temporadas...</Text>
      </View>
    );
  }

  if (!activePlaylist) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyEmoji}>🍿</Text>
        <Text style={styles.emptyTitle}>Nenhuma playlist ativa</Text>
        <Text style={styles.emptySubtitle}>
          Ative uma lista com séries na seção "Playlists" para assistir suas temporadas favoritas.
        </Text>
        <FocusableItem
          hasTVPreferredFocus={true}
          style={styles.goToPlaylistsBtn}
          focusedStyle={styles.goToPlaylistsBtnFocused}
          onPress={onNavigateToPlaylists}
        >
          {(focused) => (
            <Text style={[styles.goToPlaylistsText, focused && styles.textFocused]}>
              Ir para Playlists
            </Text>
          )}
        </FocusableItem>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de Filtro de Categorias */}
      <View style={styles.categoryBar}>
        <Text style={styles.filterTitle}>GÊNEROS:</Text>
        <FlatList
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', name: 'TODOS' }, ...categories]}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const isCatActive = selectedCategory === item.name;
            return (
              <FocusableItem
                hasTVPreferredFocus={index === 0}
                style={[
                  styles.genrePill,
                  isCatActive && styles.genrePillActive,
                ]}
                focusedStyle={styles.genrePillFocused}
                onPress={() => setSelectedCategory(item.name)}
              >
                {(focused) => (
                  <Text
                    style={[
                      styles.genrePillText,
                      isCatActive && styles.genrePillTextActive,
                      focused && styles.textFocused,
                    ]}
                  >
                    {item.name}
                  </Text>
                )}
              </FocusableItem>
            );
          }}
        />
      </View>

      {/* Grade de Séries + Painel de Detalhes */}
      <View style={styles.mainArea}>
        {/* Coluna Grade de Séries */}
        <View style={styles.gridColumn}>
          {filteredSeries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>
                Nenhuma série encontrada nesta categoria. A playlist de demonstração inclui episódios de Cosmos e Open Source Cinema.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredSeries}
              numColumns={4}
              keyExtractor={(item) => item.id}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              renderItem={({ item }) => {
                const isSelected = selectedSeries?.id === item.id;
                return (
                  <FocusableItem
                    style={[
                      styles.seriesCard,
                      isSelected && styles.seriesCardSelected,
                    ]}
                    focusedStyle={styles.seriesCardFocused}
                    onFocus={() => {
                      setSelectedSeries(item);
                      if (item.seasonNumbers.length > 0) {
                        setActiveSeason(item.seasonNumbers[0]);
                      }
                    }}
                    onPress={() => openEpisodesModal(item)}
                  >
                    {(focused) => (
                      <View style={styles.seriesCardInner}>
                        <TVImage
                          uri={item.logoUrl}
                          style={styles.posterImage}
                          containerStyle={styles.posterContainer}
                          fallbackText="🍿"
                        />
                        <View style={styles.seriesInfo}>
                          <Text
                            style={[styles.seriesTitle, focused && styles.textFocused]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text style={styles.seriesSubText} numberOfLines={1}>
                            {item.totalEpisodes} episódio{item.totalEpisodes > 1 ? 's' : ''} • {item.seasonNumbers.length} temp.
                          </Text>
                        </View>
                      </View>
                    )}
                  </FocusableItem>
                );
              }}
            />
          )}
        </View>

        {/* Coluna Lateral: Detalhes da Série Selecionada */}
        {selectedSeries && (
          <View style={styles.detailsColumn}>
            <TVImage
              uri={selectedSeries.logoUrl}
              style={styles.detailsPoster}
              containerStyle={styles.detailsPosterContainer}
              fallbackText="🍿"
            />
            <Text style={styles.detailsTitle}>{selectedSeries.name}</Text>
            <View style={styles.detailsMetaRow}>
              <Text style={styles.metaBadge}>{selectedSeries.category}</Text>
              <Text style={styles.metaBadge}>
                {selectedSeries.seasonNumbers.length} Temporada{selectedSeries.seasonNumbers.length > 1 ? 's' : ''}
              </Text>
              <Text style={styles.metaBadge}>{selectedSeries.totalEpisodes} Episódios</Text>
            </View>
            <Text style={styles.detailsDesc}>
              Acesse as temporadas e assista a cada episódio individualmente com controle total de áudio, legendas e avanço.
            </Text>

            <FocusableItem
              style={styles.exploreEpisodesBtn}
              focusedStyle={styles.exploreEpisodesBtnFocused}
              onPress={() => openEpisodesModal(selectedSeries)}
            >
              {(focused) => (
                <View style={styles.btnRow}>
                  <Text style={styles.btnIcon}>📑</Text>
                  <Text style={[styles.exploreBtnText, focused && styles.textFocused]}>
                    Ver Temporadas e Episódios
                  </Text>
                </View>
              )}
            </FocusableItem>
          </View>
        )}
      </View>

      {/* Modal / Seletor de Temporadas e Episódios */}
      <Modal
        visible={isEpisodesModalOpen && selectedSeries !== null}
        onClose={() => setIsEpisodesModalOpen(false)}
        title={selectedSeries ? `${selectedSeries.name} • Episódios` : 'Episódios'}
      >
        {selectedSeries && (
          <View style={styles.modalContent}>
            {/* Seletor Horizontal de Temporadas */}
            <View style={styles.seasonSelectorRow}>
              <Text style={styles.seasonLabel}>TEMPORADA:</Text>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                {selectedSeries.seasonNumbers.map((sNum) => {
                  const isActive = activeSeason === sNum;
                  return (
                    <FocusableItem
                      key={`season_${sNum}`}
                      style={[
                        styles.seasonTab,
                        isActive && styles.seasonTabActive,
                      ]}
                      focusedStyle={styles.seasonTabFocused}
                      onPress={() => setActiveSeason(sNum)}
                    >
                      {(focused) => (
                        <Text
                          style={[
                            styles.seasonTabText,
                            isActive && styles.seasonTabTextActive,
                            focused && styles.textFocused,
                          ]}
                        >
                          Temporada {sNum} ({selectedSeries.seasons[sNum]?.length || 0})
                        </Text>
                      )}
                    </FocusableItem>
                  );
                })}
              </ScrollView>
            </View>

            {/* Lista Vertical de Episódios da Temporada Ativa */}
            <View style={styles.episodeListContainer}>
              <Text style={styles.episodeListTitle}>
                EPISÓDIOS DA TEMPORADA {activeSeason}:
              </Text>

              <FlatList
                data={selectedSeries.seasons[activeSeason] || []}
                keyExtractor={(item) => item.channel.id}
                initialNumToRender={10}
                renderItem={({ item }) => {
                  const epNumberFormatted = String(item.episode).padStart(2, '0');
                  return (
                    <FocusableItem
                      style={styles.episodeRow}
                      focusedStyle={styles.episodeRowFocused}
                      onPress={() => {
                        setIsEpisodesModalOpen(false);
                        onPlayEpisode?.(item.channel);
                      }}
                    >
                      {(focused) => (
                        <View style={styles.episodeRowInner}>
                          <View style={styles.episodeBadge}>
                            <Text style={styles.episodeBadgeText}>
                              E{epNumberFormatted}
                            </Text>
                          </View>

                          <View style={styles.episodeInfo}>
                            <Text
                              style={[
                                styles.episodeName,
                                focused && styles.textFocused,
                              ]}
                              numberOfLines={1}
                            >
                              {item.episodeTitle}
                            </Text>
                            <Text style={styles.episodeSub}>
                              {selectedSeries.name} • S{String(item.season).padStart(2, '0')}E{epNumberFormatted}
                            </Text>
                          </View>

                          <View style={styles.playEpisodeBtn}>
                            <Text style={styles.playEpisodeIcon}>▶</Text>
                            <Text style={styles.playEpisodeText}>Assistir</Text>
                          </View>
                        </View>
                      )}
                    </FocusableItem>
                  );
                }}
              />
            </View>

            <FocusableItem
              style={styles.closeModalBtn}
              focusedStyle={styles.closeModalBtnFocused}
              onPress={() => setIsEpisodesModalOpen(false)}
            >
              {(focused) => (
                <Text style={[styles.closeModalText, focused && styles.textFocused]}>
                  Voltar ao Catálogo
                </Text>
              )}
            </FocusableItem>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 14,
    fontSize: 14,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 500,
    marginBottom: 20,
  },
  goToPlaylistsBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goToPlaylistsBtnFocused: {
    backgroundColor: '#0ea5e9',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.04 }],
  },
  goToPlaylistsText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  categoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    height: 40,
  },
  filterTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginRight: 10,
  },
  genrePill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  genrePillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  genrePillFocused: {
    borderColor: '#38bdf8',
    backgroundColor: '#0369a1',
    transform: [{ scale: 1.08 }],
  },
  genrePillText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  genrePillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  gridColumn: {
    flex: 3,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyBoxText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  seriesCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#131c2e',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  seriesCardSelected: {
    borderColor: '#0284c7',
  },
  seriesCardFocused: {
    borderColor: '#38bdf8',
    backgroundColor: '#1e293b',
    transform: [{ scale: 1.04 }],
  },
  seriesCardInner: {
    padding: 8,
    alignItems: 'center',
  },
  posterContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#090d16',
    marginBottom: 8,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  seriesInfo: {
    width: '100%',
  },
  seriesTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  seriesSubText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '500',
  },
  detailsColumn: {
    flex: 1.4,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  detailsPosterContainer: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#090d16',
    marginBottom: 12,
  },
  detailsPoster: {
    width: '100%',
    height: '100%',
  },
  detailsTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  detailsMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  metaBadge: {
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  detailsDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  exploreEpisodesBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  exploreEpisodesBtnFocused: {
    backgroundColor: '#0ea5e9',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.03 }],
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnIcon: {
    fontSize: 16,
  },
  exploreBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  textFocused: {
    color: '#ffffff',
  },
  // Estilos do Modal de Episódios
  modalContent: {
    maxHeight: 480,
  },
  seasonSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  seasonLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    marginRight: 10,
    letterSpacing: 1,
  },
  seasonTab: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  seasonTabActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  seasonTabFocused: {
    borderColor: '#38bdf8',
    backgroundColor: '#0369a1',
    transform: [{ scale: 1.05 }],
  },
  seasonTabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  seasonTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  episodeListContainer: {
    maxHeight: 320,
    marginBottom: 14,
  },
  episodeListTitle: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  episodeRow: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  episodeRowFocused: {
    borderColor: '#38bdf8',
    backgroundColor: '#1e293b',
    transform: [{ scale: 1.02 }],
  },
  episodeRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  episodeBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  episodeSub: {
    color: '#64748b',
    fontSize: 11,
  },
  playEpisodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  playEpisodeIcon: {
    color: '#ffffff',
    fontSize: 10,
  },
  playEpisodeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  closeModalBtn: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  closeModalBtnFocused: {
    backgroundColor: '#475569',
    borderColor: '#94a3b8',
    transform: [{ scale: 1.02 }],
  },
  closeModalText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
});
