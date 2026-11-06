import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { dbManager, ChannelRow, PlaylistRow } from '../db/database';
import { FocusableItem } from '../components/FocusableItem';
import { TVImage } from '../components/TVImage';

interface FavoritesScreenProps {
  onPlayItem?: (item: ChannelRow) => void;
  onNavigateToLive?: () => void;
}

type FavFilter = 'all' | 'live' | 'movie' | 'series';

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  onPlayItem,
  onNavigateToLive,
}) => {
  const [activePlaylist, setActivePlaylist] = useState<PlaylistRow | null>(null);
  const [favorites, setFavorites] = useState<ChannelRow[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FavFilter>('all');
  const [selectedItem, setSelectedItem] = useState<ChannelRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await dbManager.init();
      const pl = await dbManager.getActivePlaylist();
      setActivePlaylist(pl);

      if (pl) {
        const favs = await dbManager.getFavorites(pl.id);
        setFavorites(favs);
        if (favs.length > 0) {
          setSelectedItem(favs[0]);
        } else {
          setSelectedItem(null);
        }
      }
    } catch (e: any) {
      console.error('[FavoritesScreen] Erro ao carregar favoritos:', e);
      setFeedback(`Erro ao carregar: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Remove dos favoritos com atualização instantânea no SQLite
  const handleRemoveFavorite = async (item: ChannelRow) => {
    try {
      await dbManager.toggleFavorite(item.id);
      setFavorites((prev) => prev.filter((f) => f.id !== item.id));
      if (selectedItem?.id === item.id) {
        const remaining = favorites.filter((f) => f.id !== item.id);
        setSelectedItem(remaining.length > 0 ? remaining[0] : null);
      }
      setFeedback(`"${item.name}" removido dos favoritos.`);
    } catch (e: any) {
      console.error('[FavoritesScreen] Erro ao desfavoritar:', e);
    }
  };

  // Contagem por tipo
  const counts = useMemo(() => {
    const live = favorites.filter((f) => f.stream_type === 'live').length;
    const movie = favorites.filter((f) => f.stream_type === 'movie').length;
    const series = favorites.filter((f) => f.stream_type === 'series').length;
    return { all: favorites.length, live, movie, series };
  }, [favorites]);

  // Itens filtrados
  const filteredList = useMemo(() => {
    if (selectedFilter === 'all') return favorites;
    return favorites.filter((f) => f.stream_type === selectedFilter);
  }, [favorites, selectedFilter]);

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

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Carregando seus favoritos...</Text>
      </View>
    );
  }

  if (!activePlaylist) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyEmoji}>⭐</Text>
        <Text style={styles.emptyTitle}>Nenhuma playlist ativa</Text>
        <Text style={styles.emptySubtitle}>
          Ative uma lista na seção "Playlists" para gerenciar seus canais e conteúdos favoritos.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de Filtro de Tipos de Favoritos */}
      <View style={styles.filterRow}>
        <FocusableItem
          hasTVPreferredFocus={true}
          style={[styles.filterPill, selectedFilter === 'all' && styles.filterPillActive]}
          focusedStyle={styles.filterPillFocused}
          onPress={() => setSelectedFilter('all')}
        >
          {(focused) => (
            <Text
              style={[
                styles.filterPillText,
                selectedFilter === 'all' && styles.filterPillTextActive,
                focused && styles.textFocused,
              ]}
            >
              TODOS ({counts.all})
            </Text>
          )}
        </FocusableItem>

        <FocusableItem
          style={[styles.filterPill, selectedFilter === 'live' && styles.filterPillActive]}
          focusedStyle={styles.filterPillFocused}
          onPress={() => setSelectedFilter('live')}
        >
          {(focused) => (
            <Text
              style={[
                styles.filterPillText,
                selectedFilter === 'live' && styles.filterPillTextActive,
                focused && styles.textFocused,
              ]}
            >
              📺 AO VIVO ({counts.live})
            </Text>
          )}
        </FocusableItem>

        <FocusableItem
          style={[styles.filterPill, selectedFilter === 'movie' && styles.filterPillActive]}
          focusedStyle={styles.filterPillFocused}
          onPress={() => setSelectedFilter('movie')}
        >
          {(focused) => (
            <Text
              style={[
                styles.filterPillText,
                selectedFilter === 'movie' && styles.filterPillTextActive,
                focused && styles.textFocused,
              ]}
            >
              🎬 FILMES ({counts.movie})
            </Text>
          )}
        </FocusableItem>

        <FocusableItem
          style={[styles.filterPill, selectedFilter === 'series' && styles.filterPillActive]}
          focusedStyle={styles.filterPillFocused}
          onPress={() => setSelectedFilter('series')}
        >
          {(focused) => (
            <Text
              style={[
                styles.filterPillText,
                selectedFilter === 'series' && styles.filterPillTextActive,
                focused && styles.textFocused,
              ]}
            >
              🍿 SÉRIES ({counts.series})
            </Text>
          )}
        </FocusableItem>

        {feedback ? (
          <Text style={styles.feedbackNotice} numberOfLines={1}>
            {feedback}
          </Text>
        ) : null}
      </View>

      {/* Conteúdo Principal: Lista/Grade + Detalhes */}
      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>Nenhum item favoritado ainda</Text>
          <Text style={styles.emptySubtitle}>
            Para adicionar um canal, filme ou série aos seus favoritos, selecione o item em qualquer tela e pressione o botão "Adicionar aos Favoritos".
          </Text>
          <FocusableItem
            style={styles.actionBtn}
            focusedStyle={styles.actionBtnFocused}
            onPress={onNavigateToLive}
          >
            {(focused) => (
              <Text style={[styles.actionBtnText, focused && styles.textFocused]}>
                Explorar Canais Ao Vivo
              </Text>
            )}
          </FocusableItem>
        </View>
      ) : (
        <View style={styles.mainLayout}>
          {/* Grade / Lista de Favoritos */}
          <View style={styles.listColumn}>
            <FlatList
              data={filteredList}
              numColumns={3}
              keyExtractor={(item) => item.id}
              initialNumToRender={9}
              renderItem={({ item }) => {
                const isSelected = selectedItem?.id === item.id;
                const badge = getTypeBadge(item.stream_type);

                return (
                  <FocusableItem
                    style={[
                      styles.card,
                      isSelected && styles.cardSelected,
                    ]}
                    focusedStyle={styles.cardFocused}
                    onFocus={() => setSelectedItem(item)}
                    onPress={() => onPlayItem?.(item)}
                  >
                    {(focused) => (
                      <View style={styles.cardInner}>
                        <View style={styles.cardHeader}>
                          <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                            <Text style={styles.typeBadgeText}>{badge.label}</Text>
                          </View>
                          <Text style={styles.starIcon}>⭐</Text>
                        </View>

                        <View style={styles.logoBox}>
                          <TVImage
                            uri={item.logo_url}
                            style={styles.cardLogo}
                            containerStyle={styles.cardLogoContainer}
                            fallbackText={item.name}
                          />
                        </View>

                        <Text
                          style={[styles.cardTitle, focused && styles.textFocused]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.cardGroup} numberOfLines={1}>
                          {item.group_title}
                        </Text>
                      </View>
                    )}
                  </FocusableItem>
                );
              }}
            />
          </View>

          {/* Painel Lateral com Ações do Favorito Selecionado */}
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

              <Text style={styles.detailsDesc}>
                Item salvo em seus favoritos locais no banco SQLite para acesso ultra-rápido.
              </Text>

              {/* Botões de Ação */}
              <View style={styles.actionsContainer}>
                <FocusableItem
                  style={styles.playBtn}
                  focusedStyle={styles.playBtnFocused}
                  onPress={() => onPlayItem?.(selectedItem)}
                >
                  {(focused) => (
                    <View style={styles.btnRow}>
                      <Text style={styles.btnEmoji}>▶️</Text>
                      <Text style={[styles.playBtnText, focused && styles.textFocused]}>
                        Reproduzir Agora
                      </Text>
                    </View>
                  )}
                </FocusableItem>

                <FocusableItem
                  style={styles.removeBtn}
                  focusedStyle={styles.removeBtnFocused}
                  onPress={() => handleRemoveFavorite(selectedItem)}
                >
                  {(focused) => (
                    <View style={styles.btnRow}>
                      <Text style={styles.btnEmoji}>❌</Text>
                      <Text style={[styles.removeBtnText, focused && styles.textFocused]}>
                        Remover dos Favoritos
                      </Text>
                    </View>
                  )}
                </FocusableItem>
              </View>
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
  emptyContainer: {
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
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 520,
    lineHeight: 22,
    marginBottom: 24,
  },
  actionBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionBtnFocused: {
    backgroundColor: '#0ea5e9',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.04 }],
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    height: 40,
  },
  filterPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  filterPillFocused: {
    borderColor: '#38bdf8',
    backgroundColor: '#0369a1',
    transform: [{ scale: 1.08 }],
  },
  filterPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  feedbackNotice: {
    color: '#38bdf8',
    fontSize: 12,
    marginLeft: 'auto',
    fontStyle: 'italic',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  listColumn: {
    flex: 3,
  },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: '#131c2e',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    padding: 10,
  },
  cardSelected: {
    borderColor: '#0284c7',
  },
  cardFocused: {
    borderColor: '#38bdf8',
    backgroundColor: '#1e293b',
    transform: [{ scale: 1.04 }],
  },
  cardInner: {
    alignItems: 'center',
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  starIcon: {
    fontSize: 14,
  },
  logoBox: {
    width: '100%',
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#0b0f17',
  },
  cardLogo: {
    width: '100%',
    height: '100%',
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
    marginBottom: 2,
  },
  cardGroup: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
  },
  detailsColumn: {
    flex: 1.3,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  detailsLogoBox: {
    width: '100%',
    height: 110,
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
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  detailsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
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
  detailsDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  actionsContainer: {
    gap: 8,
  },
  playBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  playBtnFocused: {
    backgroundColor: '#0ea5e9',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.03 }],
  },
  removeBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  removeBtnFocused: {
    backgroundColor: '#991b1b',
    borderColor: '#ef4444',
    transform: [{ scale: 1.03 }],
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnEmoji: {
    fontSize: 14,
  },
  playBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  removeBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  textFocused: {
    color: '#ffffff',
  },
});
