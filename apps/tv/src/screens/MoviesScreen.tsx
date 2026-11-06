import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { dbManager, ChannelRow, CategoryRow, PlaylistRow } from '../db/database';
import { FocusableItem } from '../components/FocusableItem';
import { TVImage } from '../components/TVImage';

interface MoviesScreenProps {
  onPlayMovie?: (movie: ChannelRow) => void;
  onNavigateToPlaylists?: () => void;
}

export const MoviesScreen: React.FC<MoviesScreenProps> = ({
  onPlayMovie,
  onNavigateToPlaylists,
}) => {
  const [activePlaylist, setActivePlaylist] = useState<PlaylistRow | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [movies, setMovies] = useState<ChannelRow[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<ChannelRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await dbManager.init();
      const pl = await dbManager.getActivePlaylist();
      setActivePlaylist(pl);

      if (pl) {
        const cats = await dbManager.getCategories(pl.id, 'movie');
        setCategories(cats);

        const initialMovies = await dbManager.getChannelsByCategory(
          pl.id,
          'TODOS',
          'movie',
          200,
          0
        );
        setMovies(initialMovies);
        if (initialMovies.length > 0) {
          setSelectedMovie(initialMovies[0]);
        }
      }
    } catch (e) {
      console.error('[MoviesScreen] Erro ao carregar filmes:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectCategory = async (categoryName: string) => {
    setSelectedCategory(categoryName);
    if (!activePlaylist) return;

    try {
      const list = await dbManager.getChannelsByCategory(
        activePlaylist.id,
        categoryName,
        'movie',
        200,
        0
      );
      setMovies(list);
      if (list.length > 0) {
        setSelectedMovie(list[0]);
      } else {
        setSelectedMovie(null);
      }
    } catch (e) {
      console.error('[MoviesScreen] Erro ao filtrar filmes:', e);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Carregando catálogo de filmes...</Text>
      </View>
    );
  }

  if (!activePlaylist) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyEmoji}>🎬</Text>
        <Text style={styles.emptyTitle}>Nenhuma playlist ativa</Text>
        <Text style={styles.emptySubtitle}>
          Ative uma lista com filmes VOD na seção "Playlists".
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
      {/* Barra Superior com Filtro de Categorias Horizontais */}
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
                onPress={() => handleSelectCategory(item.name)}
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

      {/* Área Central: Grid de Pôsteres + Painel Lateral */}
      <View style={styles.mainArea}>
        {/* Grade de Pôsteres Virtualizada */}
        <View style={styles.gridColumn}>
          {movies.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>
                Nenhum filme encontrado nesta categoria. A playlist de demonstração inclui curtas em 4K (Big Buck Bunny, Tears of Steel e Sintel).
              </Text>
            </View>
          ) : (
            <FlatList
              data={movies}
              numColumns={4}
              keyExtractor={(item) => item.id}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              renderItem={({ item }) => {
                const isSelected = selectedMovie?.id === item.id;
                return (
                  <FocusableItem
                    style={[
                      styles.movieCard,
                      isSelected && styles.movieCardSelected,
                    ]}
                    focusedStyle={styles.movieCardFocused}
                    onFocus={() => setSelectedMovie(item)}
                    onPress={() => onPlayMovie?.(item)}
                  >
                    {(focused) => (
                      <View style={styles.movieCardInner}>
                        <TVImage
                          uri={item.logo_url}
                          style={styles.posterImage}
                          containerStyle={styles.posterContainer}
                          fallbackText="🎬"
                        />
                        <View style={styles.movieInfo}>
                          <Text
                            style={[styles.movieTitle, focused && styles.textFocused]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text style={styles.movieGroup} numberOfLines={1}>
                            {item.group_title}
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

        {/* Detalhes do Filme Selecionado à Direita */}
        {selectedMovie && (
          <View style={styles.detailsColumn}>
            <TVImage
              uri={selectedMovie.logo_url}
              style={styles.detailsPoster}
              containerStyle={styles.detailsPosterContainer}
              fallbackText="🎬"
            />
            <Text style={styles.detailsTitle}>{selectedMovie.name}</Text>
            <View style={styles.detailsMetaRow}>
              <Text style={styles.metaBadge}>{selectedMovie.group_title}</Text>
              <Text style={styles.metaBadge}>4K / FHD</Text>
            </View>
            <Text style={styles.detailsDesc}>
              Filme VOD disponível para reprodução imediata com suporte a áudio multicanal e legendas.
            </Text>

            <FocusableItem
              style={styles.watchMovieBtn}
              focusedStyle={styles.watchMovieBtnFocused}
              onPress={() => onPlayMovie?.(selectedMovie)}
            >
              {(focused) => (
                <Text style={[styles.watchMovieText, focused && styles.textFocused]}>
                  ▶ Reproduzir Filme
                </Text>
              )}
            </FocusableItem>
          </View>
        )}
      </View>
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
    marginBottom: 14,
    gap: 12,
  },
  filterTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  genrePill: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  genrePillActive: {
    backgroundColor: '#0369a1',
    borderColor: '#38bdf8',
  },
  genrePillFocused: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.05 }],
  },
  genrePillText: {
    color: '#94a3b8',
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
    flex: 1,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyBoxText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 400,
  },
  movieCard: {
    flex: 1 / 4,
    margin: 6,
    borderRadius: 10,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  movieCardSelected: {
    borderColor: '#0284c7',
  },
  movieCardFocused: {
    borderColor: '#38bdf8',
    backgroundColor: '#0f233d',
    transform: [{ scale: 1.04 }],
    elevation: 8,
    shadowColor: '#38bdf8',
    shadowOpacity: 0.5,
  },
  movieCardInner: {
    padding: 8,
  },
  posterContainer: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#070b14',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  movieInfo: {
    gap: 2,
  },
  movieTitle: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '700',
  },
  movieGroup: {
    color: '#64748b',
    fontSize: 11,
  },
  detailsColumn: {
    width: 260,
    backgroundColor: '#0c1322',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    alignItems: 'center',
  },
  detailsPosterContainer: {
    width: 140,
    height: 190,
    borderRadius: 10,
    marginBottom: 12,
  },
  detailsPoster: {
    width: '100%',
    height: '100%',
  },
  detailsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  detailsMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metaBadge: {
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  detailsDesc: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  watchMovieBtn: {
    width: '100%',
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  watchMovieBtnFocused: {
    backgroundColor: '#0ea5e9',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.04 }],
  },
  watchMovieText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  textFocused: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
