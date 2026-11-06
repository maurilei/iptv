import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SideMenu } from '../components/SideMenu';
import { FocusableItem } from '../components/FocusableItem';
import { ActiveSection } from '../types/navigation';
import { useTVRemote } from '../hooks/useTVRemote';
import { PlaylistsScreen } from './PlaylistsScreen';
import { LiveScreen } from './LiveScreen';
import { MoviesScreen } from './MoviesScreen';
import { SeriesScreen } from './SeriesScreen';
import { FavoritesScreen } from './FavoritesScreen';
import { SearchScreen } from './SearchScreen';
import { dbManager, PlaylistRow, ChannelRow } from '../db/database';

export const HomeScreen: React.FC = () => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('live');
  const [activePlaylist, setActivePlaylist] = useState<PlaylistRow | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [playbackFeedback, setPlaybackFeedback] = useState<string | null>(null);
  const [selectedActionMessage, setSelectedActionMessage] = useState<string>(
    'Navegação por D-pad ativa. Selecione uma seção no menu lateral ou um canal abaixo.'
  );

  const { lastEvent, eventCount } = useTVRemote();

  const loadActivePlaylist = useCallback(async () => {
    try {
      await dbManager.init();
      const pl = await dbManager.getActivePlaylist();
      setActivePlaylist(pl);
      // Se não houver playlist ativa, abre a tela de playlists diretamente
      if (!pl) {
        setActiveSection('playlists');
      }
    } catch (e) {
      console.error('[HomeScreen] Erro ao carregar playlist ativa:', e);
    }
  }, []);

  useEffect(() => {
    loadActivePlaylist();
  }, [loadActivePlaylist]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  const handlePlayItem = (item: ChannelRow) => {
    const typeLabel =
      item.stream_type === 'live'
        ? 'Canal Ao Vivo'
        : item.stream_type === 'movie'
        ? 'Filme VOD'
        : 'Episódio de Série';

    setPlaybackFeedback(
      `▶ Reproduzir ${typeLabel}: "${item.name}"\nURL: ${item.stream_url}\n(Na Etapa 5 o player nativo ExoPlayer/Media3 e LibVLC iniciará o stream imediatamente)`
    );

    // Auto-oculta o feedback após 6 segundos
    setTimeout(() => {
      setPlaybackFeedback(null);
    }, 6000);
  };

  const getSectionTitle = (section: ActiveSection) => {
    switch (section) {
      case 'live':
        return 'Canais Ao Vivo';
      case 'movies':
        return 'Catálogo de Filmes (VOD)';
      case 'series':
        return 'Séries e Temporadas';
      case 'favorites':
        return 'Meus Favoritos';
      case 'search':
        return 'Busca Global';
      case 'epg':
        return 'Guia de Programação (EPG)';
      case 'playlists':
        return 'Gerenciamento de Playlists';
      case 'settings':
        return 'Configurações do Player';
      default:
        return 'Painel Principal';
    }
  };

  return (
    <View style={styles.container}>
      {/* Menu Lateral Estilo TiviMate */}
      <SideMenu
        activeSection={activeSection}
        onSelectSection={(sec) => {
          setActiveSection(sec);
          setSelectedActionMessage(`Seção alterada para: ${getSectionTitle(sec)}`);
          loadActivePlaylist();
        }}
      />

      {/* Conteúdo Principal à Direita */}
      <View style={styles.contentArea}>
        {/* Barra Superior de Status */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.headerSubtitle}>MTR SISTEMAS • IPTV ENGINE</Text>
            <Text style={styles.headerTitle}>{getSectionTitle(activeSection)}</Text>
          </View>

          <View style={styles.statusGroup}>
            {activePlaylist ? (
              <View style={styles.playlistBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.playlistText}>
                  {activePlaylist.name} ({activePlaylist.channel_count} canais)
                </Text>
              </View>
            ) : null}

            <View style={styles.deviceBadge}>
              <View style={styles.deviceDot} />
              <Text style={styles.deviceText}>Fire TV Stick (D-Pad)</Text>
            </View>
            <Text style={styles.clockText}>{currentTime}</Text>
          </View>
        </View>

        {/* Notificação / Feedback de Reprodução de Mídia */}
        {playbackFeedback && (
          <View style={styles.playbackAlertBox}>
            <Text style={styles.playbackAlertIcon}>🎬</Text>
            <Text style={styles.playbackAlertText}>{playbackFeedback}</Text>
          </View>
        )}

        {/* Renderiza a tela da seção ativa */}
        {activeSection === 'live' && (
          <LiveScreen
            onPlayChannel={handlePlayItem}
            onNavigateToPlaylists={() => setActiveSection('playlists')}
          />
        )}

        {activeSection === 'movies' && (
          <MoviesScreen
            onPlayMovie={handlePlayItem}
            onNavigateToPlaylists={() => setActiveSection('playlists')}
          />
        )}

        {activeSection === 'series' && (
          <SeriesScreen
            onPlayEpisode={handlePlayItem}
            onNavigateToPlaylists={() => setActiveSection('playlists')}
          />
        )}

        {activeSection === 'favorites' && (
          <FavoritesScreen
            onPlayItem={handlePlayItem}
            onNavigateToLive={() => setActiveSection('live')}
          />
        )}

        {activeSection === 'search' && (
          <SearchScreen onPlayItem={handlePlayItem} />
        )}

        {activeSection === 'playlists' && (
          <PlaylistsScreen
            onPlaylistActivated={(pl) => {
              setActivePlaylist(pl);
              setSelectedActionMessage(`Playlist ativa definida: "${pl.name}" (${pl.channel_count} canais)`);
            }}
          />
        )}

        {activeSection === 'epg' && (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>📅</Text>
              <Text style={styles.placeholderTitle}>Guia de Programação (EPG) em Grade</Text>
              <Text style={styles.placeholderDesc}>
                O motor completo de EPG será implementado na Etapa 6, com parser XMLTV em streaming (url-tvg / x-tvg-url) e EPG do Xtream Codes (get_short_epg / xmltv.php), grade horária com linha do tempo e troca rápida de canal.
              </Text>
            </View>
          </ScrollView>
        )}

        {activeSection === 'settings' && (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Alerta de Feedback de Ação */}
            <View style={styles.actionBanner}>
              <Text style={styles.actionBannerIcon}>⚙️</Text>
              <Text style={styles.actionBannerText}>{selectedActionMessage}</Text>
            </View>

            {/* Linha de Cartões de Configuração */}
            <View style={styles.cardRow}>
              {/* Cartão 1: Motores de Vídeo */}
              <FocusableItem
                style={styles.card}
                focusedStyle={styles.cardFocused}
                onPress={() =>
                  setSelectedActionMessage('Etapa 5 integrará os motores nativos Media3/ExoPlayer e LibVLC.')
                }
              >
                {(focused) => (
                  <View style={styles.cardInner}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTag}>PLAYER NATIVO</Text>
                      <Text style={styles.cardEmoji}>▶️</Text>
                    </View>
                    <Text style={[styles.cardTitle, focused && styles.cardTitleFocused]}>
                      Media3 & LibVLC
                    </Text>
                    <Text style={styles.cardDesc}>
                      HLS adaptativo, MPEG-TS nativo, decodificação MediaCodec HW e fallback automático para VLC.
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardStatusText}>Padrão: ExoPlayer (Media3)</Text>
                    </View>
                  </View>
                )}
              </FocusableItem>

              {/* Cartão 2: Diagnóstico D-Pad */}
              <FocusableItem
                style={styles.card}
                focusedStyle={styles.cardFocused}
                onPress={() =>
                  setSelectedActionMessage('Botão OK pressionado com sucesso no controle remoto!')
                }
              >
                {(focused) => (
                  <View style={styles.cardInner}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTag}>DIAGNÓSTICO D-PAD</Text>
                      <Text style={styles.cardEmoji}>🎮</Text>
                    </View>
                    <Text style={[styles.cardTitle, focused && styles.cardTitleFocused]}>
                      Captura de Teclas
                    </Text>
                    <Text style={styles.cardDesc}>
                      Último evento:{' '}
                      <Text style={styles.highlightText}>
                        {lastEvent ? `${lastEvent.eventType}` : 'Aguardando toque no controle'}
                      </Text>
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardStatusText}>Total de eventos: {eventCount}</Text>
                    </View>
                  </View>
                )}
              </FocusableItem>
            </View>

            {/* Linha 2 de Configurações */}
            <View style={styles.cardRow}>
              {/* Cartão 3: Perfil de Desempenho MXQ 4K */}
              <FocusableItem
                style={styles.card}
                focusedStyle={styles.cardFocused}
                onPress={() =>
                  setSelectedActionMessage('Perfil de baixo consumo de memória ativo para processadores quad-core fracos.')
                }
              >
                {(focused) => (
                  <View style={styles.cardInner}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTag}>HARDWARE</Text>
                      <Text style={styles.cardEmoji}>⚡</Text>
                    </View>
                    <Text style={[styles.cardTitle, focused && styles.cardTitleFocused]}>
                      Otimizações MXQ 4K
                    </Text>
                    <Text style={styles.cardDesc}>
                      Limite de resolução para 1080p, virtualização de lista leve, sem animações pesadas.
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardStatusText}>Status: Modo Equilibrado</Text>
                    </View>
                  </View>
                )}
              </FocusableItem>

              {/* Cartão 4: Banco Local */}
              <FocusableItem
                style={styles.card}
                focusedStyle={styles.cardFocused}
                onPress={() =>
                  setSelectedActionMessage('Banco SQLite JSI com WAL e índices otimizados para 50.000+ itens.')
                }
              >
                {(focused) => (
                  <View style={styles.cardInner}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTag}>BANCO LOCAL</Text>
                      <Text style={styles.cardEmoji}>💾</Text>
                    </View>
                    <Text style={[styles.cardTitle, focused && styles.cardTitleFocused]}>
                      SQLite WAL C++
                    </Text>
                    <Text style={styles.cardDesc}>
                      Armazenamento local permanente com índices rápidos para busca e filtros de categorias.
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardStatusText}>Status: WAL Ativo (JSI)</Text>
                    </View>
                  </View>
                )}
              </FocusableItem>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#070a0f',
  },
  contentArea: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 16,
    paddingLeft: 24,
    paddingRight: 32, // Margem de segurança de overscan para TVs Philco
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
  },
  headerSubtitle: {
    color: '#0284c7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playlistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c4a6e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#38bdf8',
    marginRight: 6,
  },
  deviceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  playlistText: {
    color: '#e0f2fe',
    fontSize: 11,
    fontWeight: '700',
  },
  deviceText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  clockText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 6,
  },
  playbackAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 10,
  },
  playbackAlertIcon: {
    fontSize: 20,
  },
  playbackAlertText: {
    color: '#ecfdf5',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#132337',
    borderWidth: 1,
    borderColor: '#0284c7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  actionBannerIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  actionBannerText: {
    color: '#e0f2fe',
    fontSize: 13,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 18,
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  cardFocused: {
    backgroundColor: '#1e293b',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.03 }],
  },
  cardInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTag: {
    color: '#0284c7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardTitleFocused: {
    color: '#38bdf8',
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  highlightText: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  cardStatusText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  placeholderCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 40,
    marginTop: 20,
  },
  placeholderIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  placeholderTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  placeholderDesc: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 22,
  },
});
