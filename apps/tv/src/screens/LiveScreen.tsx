import React, { useState, useEffect, useCallback, useRef } from 'react';
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

interface LiveScreenProps {
  onPlayChannel?: (channel: ChannelRow) => void;
  onNavigateToPlaylists?: () => void;
}

const ITEM_HEIGHT = 58;

export const LiveScreen: React.FC<LiveScreenProps> = ({
  onPlayChannel,
  onNavigateToPlaylists,
}) => {
  const [activePlaylist, setActivePlaylist] = useState<PlaylistRow | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFeedback, setStatusFeedback] = useState<string>('');

  const channelListRef = useRef<FlatList>(null);

  // Carrega playlist ativa e categorias
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      await dbManager.init();
      const pl = await dbManager.getActivePlaylist();
      setActivePlaylist(pl);

      if (pl) {
        const cats = await dbManager.getCategories(pl.id, 'live');
        setCategories(cats);

        // Carrega canais da primeira categoria ou TODOS
        const initialChannels = await dbManager.getChannelsByCategory(
          pl.id,
          'TODOS',
          'live',
          300,
          0
        );
        setChannels(initialChannels);
        if (initialChannels.length > 0) {
          setSelectedChannel(initialChannels[0]);
        }
      }
    } catch (e: any) {
      console.error('[LiveScreen] Erro ao carregar dados:', e);
      setStatusFeedback(`Erro: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Carrega canais quando a categoria muda
  const handleSelectCategory = async (categoryName: string) => {
    setSelectedCategory(categoryName);
    if (!activePlaylist) return;

    try {
      const chs = await dbManager.getChannelsByCategory(
        activePlaylist.id,
        categoryName,
        'live',
        300,
        0
      );
      setChannels(chs);
      if (chs.length > 0) {
        setSelectedChannel(chs[0]);
      } else {
        setSelectedChannel(null);
      }
      channelListRef.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (e: any) {
      console.error('[LiveScreen] Erro ao trocar categoria:', e);
    }
  };

  // Alterna status de favorito no banco SQLite
  const handleToggleFavorite = async (channel: ChannelRow) => {
    try {
      const isFav = await dbManager.toggleFavorite(channel.id);
      setChannels((prev) =>
        prev.map((c) => (c.id === channel.id ? { ...c, is_favorite: isFav ? 1 : 0 } : c))
      );
      if (selectedChannel && selectedChannel.id === channel.id) {
        setSelectedChannel({ ...selectedChannel, is_favorite: isFav ? 1 : 0 });
      }
      setStatusFeedback(
        isFav
          ? `Canal "${channel.name}" adicionado aos Favoritos!`
          : `Canal "${channel.name}" removido dos Favoritos.`
      );
    } catch (e: any) {
      console.error('[LiveScreen] Erro ao favoritar:', e);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Carregando grade de canais ao vivo...</Text>
      </View>
    );
  }

  if (!activePlaylist) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyEmoji}>📺</Text>
        <Text style={styles.emptyTitle}>Nenhuma playlist ativa no momento</Text>
        <Text style={styles.emptySubtitle}>
          Ative uma lista M3U ou Xtream Codes na seção "Playlists" para carregar a programação.
        </Text>
        <FocusableItem
          hasTVPreferredFocus={true}
          style={styles.goToPlaylistsBtn}
          focusedStyle={styles.goToPlaylistsBtnFocused}
          onPress={onNavigateToPlaylists}
        >
          {(focused) => (
            <Text style={[styles.goToPlaylistsText, focused && styles.textFocused]}>
              Ir para Gerenciar Playlists
            </Text>
          )}
        </FocusableItem>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Coluna 1: Categorias (Grupos de Canais) */}
      <View style={styles.categoriesColumn}>
        <Text style={styles.columnTitle}>CATEGORIAS</Text>
        <ScrollView
          style={styles.categoriesScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Categoria TODOS */}
          <FocusableItem
            hasTVPreferredFocus={true}
            style={[
              styles.categoryItem,
              selectedCategory === 'TODOS' && styles.categoryItemActive,
            ]}
            focusedStyle={styles.categoryItemFocused}
            onPress={() => handleSelectCategory('TODOS')}
          >
            {(focused) => (
              <View style={styles.categoryContent}>
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === 'TODOS' && styles.categoryTextActive,
                    focused && styles.textFocused,
                  ]}
                  numberOfLines={1}
                >
                  TODOS OS CANAIS
                </Text>
                {selectedCategory === 'TODOS' && <View style={styles.activeDot} />}
              </View>
            )}
          </FocusableItem>

          {/* Lista de Categorias do Banco */}
          {categories.map((cat) => {
            const isCatActive = selectedCategory === cat.name;
            return (
              <FocusableItem
                key={cat.id}
                style={[
                  styles.categoryItem,
                  isCatActive && styles.categoryItemActive,
                ]}
                focusedStyle={styles.categoryItemFocused}
                onPress={() => handleSelectCategory(cat.name)}
              >
                {(focused) => (
                  <View style={styles.categoryContent}>
                    <Text
                      style={[
                        styles.categoryText,
                        isCatActive && styles.categoryTextActive,
                        focused && styles.textFocused,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    {isCatActive && <View style={styles.activeDot} />}
                  </View>
                )}
              </FocusableItem>
            );
          })}
        </ScrollView>
      </View>

      {/* Coluna 2: Lista de Canais Virtualizada */}
      <View style={styles.channelsColumn}>
        <View style={styles.channelHeaderRow}>
          <Text style={styles.columnTitle}>
            {selectedCategory} ({channels.length})
          </Text>
          {statusFeedback ? (
            <Text style={styles.statusFeedbackText} numberOfLines={1}>
              {statusFeedback}
            </Text>
          ) : null}
        </View>

        {channels.length === 0 ? (
          <View style={styles.noChannelsBox}>
            <Text style={styles.noChannelsText}>Nenhum canal nesta categoria.</Text>
          </View>
        ) : (
          <FlatList
            ref={channelListRef}
            data={channels}
            keyExtractor={(item) => item.id}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            getItemLayout={(_data, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
            renderItem={({ item, index }) => {
              const isSelected = selectedChannel?.id === item.id;
              const chNumber = item.channel_number || index + 1;
              const formattedNumber = String(chNumber).padStart(2, '0');

              return (
                <FocusableItem
                  style={[
                    styles.channelRow,
                    isSelected && styles.channelRowSelected,
                  ]}
                  focusedStyle={styles.channelRowFocused}
                  onFocus={() => setSelectedChannel(item)}
                  onPress={() => onPlayChannel?.(item)}
                >
                  {(focused) => (
                    <View style={styles.channelRowInner}>
                      <Text style={styles.channelNumber}>{formattedNumber}</Text>

                      <View style={styles.logoWrapper}>
                        <TVImage
                          uri={item.logo_url}
                          style={styles.channelLogo}
                          containerStyle={styles.logoContainer}
                          fallbackText={item.name}
                        />
                      </View>

                      <View style={styles.channelNameGroup}>
                        <Text
                          style={[
                            styles.channelName,
                            focused && styles.textFocused,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.channelGroupTag} numberOfLines={1}>
                          {item.group_title}
                        </Text>
                      </View>

                      {item.is_favorite === 1 && (
                        <Text style={styles.favoriteBadge}>⭐</Text>
                      )}

                      <View style={styles.qualityBadge}>
                        <Text style={styles.qualityText}>HD</Text>
                      </View>
                    </View>
                  )}
                </FocusableItem>
              );
            }}
          />
        )}
      </View>

      {/* Coluna 3: Painel de Detalhes e Ações do Canal Selecionado */}
      <View style={styles.detailsColumn}>
        {selectedChannel ? (
          <View style={styles.detailsCard}>
            <View style={styles.previewLogoBox}>
              <TVImage
                uri={selectedChannel.logo_url}
                style={styles.previewLogo}
                containerStyle={styles.previewLogoContainer}
                fallbackText={selectedChannel.name}
              />
            </View>

            <Text style={styles.previewTitle} numberOfLines={2}>
              {selectedChannel.name}
            </Text>

            <View style={styles.previewMetaRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{selectedChannel.group_title}</Text>
              </View>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>AO VIVO</Text>
              </View>
            </View>

            <View style={styles.epgPreviewCard}>
              <Text style={styles.epgNowTitle}>PROGRAMAÇÃO ATUAL</Text>
              <Text style={styles.epgShowTitle}>Transmissão Ao Vivo Contínua</Text>
              <Text style={styles.epgShowDesc}>
                Guia EPG completo será integrado na Etapa 6 via XMLTV e Xtream Codes.
              </Text>
            </View>

            {/* Ações do Canal */}
            <View style={styles.actionButtons}>
              <FocusableItem
                style={styles.playChannelBtn}
                focusedStyle={styles.playChannelBtnFocused}
                onPress={() => onPlayChannel?.(selectedChannel)}
              >
                {(focused) => (
                  <View style={styles.btnRow}>
                    <Text style={styles.btnIcon}>▶️</Text>
                    <Text style={[styles.playBtnText, focused && styles.textFocused]}>
                      Assistir Agora
                    </Text>
                  </View>
                )}
              </FocusableItem>

              <FocusableItem
                style={styles.favChannelBtn}
                focusedStyle={styles.favChannelBtnFocused}
                onPress={() => handleToggleFavorite(selectedChannel)}
              >
                {(focused) => (
                  <View style={styles.btnRow}>
                    <Text style={styles.btnIcon}>
                      {selectedChannel.is_favorite === 1 ? '⭐' : '☆'}
                    </Text>
                    <Text style={[styles.favBtnText, focused && styles.textFocused]}>
                      {selectedChannel.is_favorite === 1
                        ? 'Remover dos Favoritos'
                        : 'Adicionar aos Favoritos'}
                    </Text>
                  </View>
                )}
              </FocusableItem>
            </View>
          </View>
        ) : (
          <View style={styles.noSelectionBox}>
            <Text style={styles.noSelectionText}>Selecione um canal para ver detalhes.</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
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
  categoriesColumn: {
    width: 220,
    backgroundColor: '#0c1322',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  columnTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  categoriesScroll: {
    flex: 1,
  },
  categoryItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  categoryItemActive: {
    backgroundColor: '#1e293b',
  },
  categoryItemFocused: {
    backgroundColor: '#0369a1',
    borderColor: '#38bdf8',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  categoryTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
    marginLeft: 6,
  },
  channelsColumn: {
    flex: 1,
    backgroundColor: '#0c1322',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  channelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusFeedbackText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 300,
  },
  noChannelsBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChannelsText: {
    color: '#64748b',
    fontSize: 14,
  },
  channelRow: {
    height: ITEM_HEIGHT,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#111927',
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
  },
  channelRowSelected: {
    backgroundColor: '#17253b',
    borderColor: '#1e3a5f',
  },
  channelRowFocused: {
    backgroundColor: '#0369a1',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.02 }],
  },
  channelRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  channelNumber: {
    width: 28,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  logoWrapper: {
    marginRight: 12,
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  channelLogo: {
    width: 36,
    height: 36,
  },
  channelNameGroup: {
    flex: 1,
    marginRight: 8,
  },
  channelName: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  channelGroupTag: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  favoriteBadge: {
    fontSize: 14,
    marginRight: 8,
  },
  qualityBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualityText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  detailsColumn: {
    width: 280,
    backgroundColor: '#0c1322',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 18,
  },
  detailsCard: {
    flex: 1,
    justifyContent: 'space-between',
  },
  previewLogoBox: {
    alignItems: 'center',
    marginBottom: 14,
  },
  previewLogoContainer: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  previewLogo: {
    width: 90,
    height: 90,
  },
  previewTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  previewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  liveText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
  },
  epgPreviewCard: {
    backgroundColor: '#080d18',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  epgNowTitle: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  epgShowTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  epgShowDesc: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 15,
  },
  actionButtons: {
    gap: 10,
  },
  playChannelBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  playChannelBtnFocused: {
    backgroundColor: '#0ea5e9',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.04 }],
  },
  favChannelBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  favChannelBtnFocused: {
    backgroundColor: '#334155',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.04 }],
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnIcon: {
    fontSize: 14,
  },
  playBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  favBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  textFocused: {
    color: '#ffffff',
    fontWeight: '800',
  },
  noSelectionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSelectionText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
});
