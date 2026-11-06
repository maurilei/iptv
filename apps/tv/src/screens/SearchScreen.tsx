import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { dbManager, ChannelRow, PlaylistRow } from '../db/database';
import { FocusableItem } from '../components/FocusableItem';
import { FocusableTextInput } from '../components/FocusableTextInput';
import { TVImage } from '../components/TVImage';

interface SearchScreenProps {
  onPlayItem?: (item: ChannelRow) => void;
}

type SearchFilterType = 'all' | 'live' | 'movie' | 'series';

export const SearchScreen: React.FC<SearchScreenProps> = ({ onPlayItem }) => {
  const [activePlaylist, setActivePlaylist] = useState<PlaylistRow | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChannelRow[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<SearchFilterType>('all');
  const [selectedItem, setSelectedItem] = useState<ChannelRow | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadPlaylist = useCallback(async () => {
    try {
      await dbManager.init();
      const pl = await dbManager.getActivePlaylist();
      setActivePlaylist(pl);
    } catch (e) {
      console.error('[SearchScreen] Erro ao carregar playlist:', e);
    }
  }, []);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  // Executa busca debounced no SQLite
  const handleQueryChange = (text: string) => {
    setQuery(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text.trim()) {
      setResults([]);
      setSelectedItem(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      if (!activePlaylist) {
        setIsSearching(false);
        return;
      }
      try {
        const found = await dbManager.searchChannels(activePlaylist.id, text.trim(), 100);
        setResults(found);
        if (found.length > 0) {
          setSelectedItem(found[0]);
        } else {
          setSelectedItem(null);
        }
      } catch (e) {
        console.error('[SearchScreen] Erro na busca:', e);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  const counts = useMemo(() => {
    const live = results.filter((r) => r.stream_type === 'live').length;
    const movie = results.filter((r) => r.stream_type === 'movie').length;
    const series = results.filter((r) => r.stream_type === 'series').length;
    return { all: results.length, live, movie, series };
  }, [results]);

  const filteredResults = useMemo(() => {
    if (selectedFilter === 'all') return results;
    return results.filter((r) => r.stream_type === selectedFilter);
  }, [results, selectedFilter]);

  const getTypeBadge = (type: 'live' | 'movie' | 'series') => {
    switch (type) {
      case 'live':
        return { label: 'AO VIVO', bg: '#b91c1c' };
      case 'movie':
        return { label: 'FILME', bg: '#0284c7' };
      case 'series':
        return { label: 'SÉRIE', bg: '#7c3aed' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra de Busca com Teclado Virtual Fire TV */}
      <View style={styles.searchHeader}>
        <View style={styles.inputWrapper}>
          <FocusableTextInput
            hasTVPreferredFocus={true}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Digite o nome do canal, filme ou série..."
          />
        </View>

        {query.length > 0 && (
          <FocusableItem
            style={styles.clearBtn}
            focusedStyle={styles.clearBtnFocused}
            onPress={() => handleQueryChange('')}
          >
            {(focused) => (
              <Text style={[styles.clearBtnText, focused && styles.textFocused]}>
                Limpar Busca
              </Text>
            )}
          </FocusableItem>
        )}
      </View>

      {/* Filtros por Categoria de Resultado */}
      {results.length > 0 && (
        <View style={styles.filterBar}>
          <FocusableItem
            style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
            focusedStyle={styles.filterTabFocused}
            onPress={() => setSelectedFilter('all')}
          >
            {(focused) => (
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === 'all' && styles.filterTabTextActive,
                  focused && styles.textFocused,
                ]}
              >
                TODOS ({counts.all})
              </Text>
            )}
          </FocusableItem>

          <FocusableItem
            style={[styles.filterTab, selectedFilter === 'live' && styles.filterTabActive]}
            focusedStyle={styles.filterTabFocused}
            onPress={() => setSelectedFilter('live')}
          >
            {(focused) => (
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === 'live' && styles.filterTabTextActive,
                  focused && styles.textFocused,
                ]}
              >
                📺 CANAIS ({counts.live})
              </Text>
            )}
          </FocusableItem>

          <FocusableItem
            style={[styles.filterTab, selectedFilter === 'movie' && styles.filterTabActive]}
            focusedStyle={styles.filterTabFocused}
            onPress={() => setSelectedFilter('movie')}
          >
            {(focused) => (
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === 'movie' && styles.filterTabTextActive,
                  focused && styles.textFocused,
                ]}
              >
                🎬 FILMES ({counts.movie})
              </Text>
            )}
          </FocusableItem>

          <FocusableItem
            style={[styles.filterTab, selectedFilter === 'series' && styles.filterTabActive]}
            focusedStyle={styles.filterTabFocused}
            onPress={() => setSelectedFilter('series')}
          >
            {(focused) => (
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === 'series' && styles.filterTabTextActive,
                  focused && styles.textFocused,
                ]}
              >
                🍿 SÉRIES ({counts.series})
              </Text>
            )}
          </FocusableItem>

          {isSearching && (
            <View style={styles.searchingBox}>
              <ActivityIndicator size="small" color="#38bdf8" />
              <Text style={styles.searchingText}>Buscando...</Text>
            </View>
          )}
        </View>
      )}

      {/* Resultados ou Telas de Ajuda */}
      {query.trim().length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Busca Global Rápida</Text>
          <Text style={styles.emptySubtitle}>
            Pressione [OK] no campo acima para abrir o teclado na tela da Fire TV e encontrar canais, filmes ou séries por título instantaneamente.
          </Text>
        </View>
      ) : results.length === 0 && !isSearching ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyEmoji}>😕</Text>
          <Text style={styles.emptyTitle}>Nenhum resultado encontrado</Text>
          <Text style={styles.emptySubtitle}>
            Não encontramos nenhum conteúdo correspondente a "{query}". Tente buscar por palavras-chave mais curtas.
          </Text>
        </View>
      ) : (
        <View style={styles.contentLayout}>
          {/* Lista de Resultados */}
          <View style={styles.listColumn}>
            <FlatList
              data={filteredResults}
              keyExtractor={(item) => item.id}
              initialNumToRender={10}
              renderItem={({ item }) => {
                const isSelected = selectedItem?.id === item.id;
                const badge = getTypeBadge(item.stream_type);

                return (
                  <FocusableItem
                    style={[
                      styles.resultRow,
                      isSelected && styles.resultRowSelected,
                    ]}
                    focusedStyle={styles.resultRowFocused}
                    onFocus={() => setSelectedItem(item)}
                    onPress={() => onPlayItem?.(item)}
                  >
                    {(focused) => (
                      <View style={styles.resultRowInner}>
                        <View style={styles.logoBox}>
                          <TVImage
                            uri={item.logo_url}
                            style={styles.resultLogo}
                            containerStyle={styles.resultLogoContainer}
                            fallbackText={item.name}
                          />
                        </View>

                        <View style={styles.itemInfo}>
                          <Text
                            style={[styles.itemTitle, focused && styles.textFocused]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text style={styles.itemCategory} numberOfLines={1}>
                            {item.group_title}
                          </Text>
                        </View>

                        <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                          <Text style={styles.typeBadgeText}>{badge.label}</Text>
                        </View>
                      </View>
                    )}
                  </FocusableItem>
                );
              }}
            />
          </View>

          {/* Detalhes do Item Selecionado */}
          {selectedItem && (
            <View style={styles.detailsColumn}>
              <View style={styles.detailsLogoBox}>
                <TVImage
                  uri={selectedItem.logo_url}
                  style={styles.detailsLogo}
                  containerStyle={styles.detailsLogoContainer}
                  fallbackText={selectedItem.name}
                />
              </View>

              <Text style={styles.detailsTitle} numberOfLines={2}>
                {selectedItem.name}
              </Text>

              <View style={styles.detailsMeta}>
                <View style={[styles.typeBadge, { backgroundColor: getTypeBadge(selectedItem.stream_type).bg }]}>
                  <Text style={styles.typeBadgeText}>
                    {getTypeBadge(selectedItem.stream_type).label}
                  </Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{selectedItem.group_title}</Text>
                </View>
              </View>

              <FocusableItem
                style={styles.playBtn}
                focusedStyle={styles.playBtnFocused}
                onPress={() => onPlayItem?.(selectedItem)}
              >
                {(focused) => (
                  <View style={styles.playBtnInner}>
                    <Text style={styles.playIcon}>▶️</Text>
                    <Text style={[styles.playBtnText, focused && styles.textFocused]}>
                      Assistir Agora
                    </Text>
                  </View>
                )}
              </FocusableItem>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  clearBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearBtnFocused: {
    backgroundColor: '#475569',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.04 }],
  },
  clearBtnText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTab: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterTabActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  filterTabFocused: {
    borderColor: '#38bdf8',
    backgroundColor: '#0369a1',
    transform: [{ scale: 1.06 }],
  },
  filterTabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  searchingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  searchingText: {
    color: '#38bdf8',
    fontSize: 12,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 14,
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
    lineHeight: 22,
  },
  contentLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  listColumn: {
    flex: 3,
  },
  resultRow: {
    backgroundColor: '#131c2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  resultRowSelected: {
    borderColor: '#0284c7',
  },
  resultRowFocused: {
    borderColor: '#38bdf8',
    backgroundColor: '#1e293b',
    transform: [{ scale: 1.02 }],
  },
  resultRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    marginRight: 12,
  },
  resultLogoContainer: {
    width: 44,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#0b0f17',
  },
  resultLogo: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemCategory: {
    color: '#64748b',
    fontSize: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  detailsColumn: {
    flex: 1.4,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  detailsLogoBox: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderRadius: 8,
    marginBottom: 12,
  },
  detailsLogoContainer: {
    width: 90,
    height: 90,
  },
  detailsLogo: {
    width: '100%',
    height: '100%',
  },
  detailsTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  detailsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  playBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  playBtnFocused: {
    backgroundColor: '#0ea5e9',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.03 }],
  },
  playBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playIcon: {
    fontSize: 14,
  },
  playBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  textFocused: {
    color: '#ffffff',
  },
});
