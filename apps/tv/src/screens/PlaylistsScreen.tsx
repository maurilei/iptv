import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { dbManager, PlaylistRow } from '../db/database';
import { PlaylistManager } from '../services/playlistManager';
import { ParseProgress } from '../services/m3uParser';
import { FocusableItem } from '../components/FocusableItem';
import { FocusableTextInput } from '../components/FocusableTextInput';
import { Modal } from '../components/Modal';

interface PlaylistsScreenProps {
  onPlaylistActivated?: (playlist: PlaylistRow) => void;
}

export const PlaylistsScreen: React.FC<PlaylistsScreenProps> = ({
  onPlaylistActivated,
}) => {
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Modais
  const [isXtreamModalOpen, setIsXtreamModalOpen] = useState(false);
  const [isM3UModalOpen, setIsM3UModalOpen] = useState(false);

  // Formulário Xtream
  const [xtreamName, setXtreamName] = useState('Meu Servidor Xtream');
  const [xtreamServer, setXtreamServer] = useState('http://servidor.exemplo.com:8080');
  const [xtreamUser, setXtreamUser] = useState('usuario');
  const [xtreamPass, setXtreamPass] = useState('senha');

  // Formulário M3U URL
  const [m3uName, setM3uName] = useState('Minha Lista M3U');
  const [m3uUrl, setM3uUrl] = useState('https://iptv-org.github.io/iptv/countries/br.m3u');

  // Estado de Progresso de Importação em Streaming
  const [importProgress, setImportProgress] = useState<ParseProgress | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const loadPlaylists = useCallback(async () => {
    setIsLoading(true);
    try {
      await dbManager.init();
      const list = await dbManager.getPlaylists();
      setPlaylists(list);
    } catch (e: any) {
      console.error('[PlaylistsScreen] Erro ao listar playlists:', e);
      setStatusMessage(`Erro: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const handleAddDemo = async () => {
    setIsImporting(true);
    setStatusMessage('Iniciando importação da lista de demonstração...');
    try {
      const active = await PlaylistManager.addDemoPlaylist((prog) => {
        setImportProgress(prog);
      });
      await loadPlaylists();
      onPlaylistActivated?.(active);
      setStatusMessage('Playlist de demonstração adicionada com sucesso!');
    } catch (e: any) {
      setStatusMessage(`Erro ao importar demonstração: ${e.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleAddXtream = async () => {
    if (!xtreamServer || !xtreamUser || !xtreamPass) {
      setStatusMessage('Preencha Servidor, Usuário e Senha do Xtream.');
      return;
    }

    setIsXtreamModalOpen(false);
    setIsImporting(true);
    setStatusMessage('Conectando ao servidor Xtream Codes...');

    try {
      const active = await PlaylistManager.addXtreamPlaylist(
        xtreamName || 'Servidor Xtream',
        xtreamServer,
        xtreamUser,
        xtreamPass,
        undefined,
        (prog) => setImportProgress(prog)
      );
      await loadPlaylists();
      onPlaylistActivated?.(active);
      setStatusMessage('Conta Xtream sincronizada e ativada!');
    } catch (e: any) {
      setStatusMessage(`Erro Xtream: ${e.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleAddM3UUrl = async () => {
    if (!m3uUrl) {
      setStatusMessage('Digite a URL da lista M3U.');
      return;
    }

    setIsM3UModalOpen(false);
    setIsImporting(true);
    setStatusMessage('Baixando e processando playlist M3U...');

    try {
      const active = await PlaylistManager.addM3UUrlPlaylist(
        m3uName || 'Lista M3U',
        m3uUrl,
        undefined,
        (prog) => setImportProgress(prog)
      );
      await loadPlaylists();
      onPlaylistActivated?.(active);
      setStatusMessage('Playlist M3U importada com sucesso!');
    } catch (e: any) {
      setStatusMessage(`Erro M3U: ${e.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleSetActive = async (playlist: PlaylistRow) => {
    try {
      await dbManager.setActivePlaylist(playlist.id);
      await loadPlaylists();
      onPlaylistActivated?.(playlist);
      setStatusMessage(`Playlist "${playlist.name}" ativada!`);
    } catch (e: any) {
      setStatusMessage(`Erro ao ativar: ${e.message}`);
    }
  };

  const handleSyncPlaylist = async (playlist: PlaylistRow) => {
    setIsImporting(true);
    setStatusMessage(`Sincronizando "${playlist.name}"...`);

    try {
      await PlaylistManager.syncPlaylist(playlist, (prog) => {
        setImportProgress(prog);
      });
      await loadPlaylists();
      setStatusMessage(`Playlist "${playlist.name}" atualizada com sucesso!`);
    } catch (e: any) {
      setStatusMessage(`Erro ao sincronizar: ${e.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      await dbManager.deletePlaylist(playlistId);
      await loadPlaylists();
      setStatusMessage('Playlist removida com sucesso.');
    } catch (e: any) {
      setStatusMessage(`Erro ao excluir: ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra de Ações do Topo - 3 Botões Proporcionais que cabem na tela */}
      <View style={styles.topActions}>
        <FocusableItem
          hasTVPreferredFocus={playlists.length === 0}
          style={[styles.topActionCard, styles.actionCardPrimary]}
          focusedStyle={styles.topActionCardFocused}
          onPress={handleAddDemo}
        >
          {(focused) => (
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardEmoji}>⭐</Text>
              <View style={styles.actionCardTexts}>
                <Text style={[styles.actionCardTitle, focused && styles.textFocused]}>
                  Demo 1-Clique
                </Text>
                <Text style={styles.actionCardDesc}>Canais Abertos & VOD</Text>
              </View>
            </View>
          )}
        </FocusableItem>

        <FocusableItem
          style={styles.topActionCard}
          focusedStyle={styles.topActionCardFocused}
          onPress={() => setIsXtreamModalOpen(true)}
        >
          {(focused) => (
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardEmoji}>🔐</Text>
              <View style={styles.actionCardTexts}>
                <Text style={[styles.actionCardTitle, focused && styles.textFocused]}>
                  Xtream Codes
                </Text>
                <Text style={styles.actionCardDesc}>Servidor, Usuário e Senha</Text>
              </View>
            </View>
          )}
        </FocusableItem>

        <FocusableItem
          style={styles.topActionCard}
          focusedStyle={styles.topActionCardFocused}
          onPress={() => setIsM3UModalOpen(true)}
        >
          {(focused) => (
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardEmoji}>🌐</Text>
              <View style={styles.actionCardTexts}>
                <Text style={[styles.actionCardTitle, focused && styles.textFocused]}>
                  M3U por URL
                </Text>
                <Text style={styles.actionCardDesc}>Link da Lista Web</Text>
              </View>
            </View>
          )}
        </FocusableItem>
      </View>

      {/* Banner de Feedback de Status */}
      {statusMessage ? (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerText}>{statusMessage}</Text>
        </View>
      ) : null}

      {/* Lista de Playlists Cadastradas */}
      <ScrollView
        style={styles.playlistList}
        contentContainerStyle={styles.playlistListContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.emptyText}>Carregando banco local SQLite...</Text>
          </View>
        ) : playlists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📂</Text>
            <Text style={styles.emptyTitle}>Nenhuma playlist cadastrada</Text>
            <Text style={styles.emptySubtitle}>
              Pressione [OK] no botão "Demo 1-Clique" acima para testar o banco local e os canais imediatamente!
            </Text>
          </View>
        ) : (
          playlists.map((pl) => {
            const isActive = pl.is_active === 1;
            return (
              <View
                key={pl.id}
                style={[styles.playlistCard, isActive && styles.playlistCardActive]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleGroup}>
                    <Text style={styles.typeBadge}>
                      {pl.type === 'xtream' ? 'XTREAM CODES' : 'M3U'}
                    </Text>
                    <Text style={styles.playlistTitle}>{pl.name}</Text>
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeText}>ATIVA</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.updatedDate}>
                    Atualizado:{' '}
                    {pl.last_updated
                      ? new Date(pl.last_updated).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Nunca'}
                  </Text>
                </View>

                {/* Métricas do Banco SQLite */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Canais Ao Vivo</Text>
                    <Text style={styles.metricValue}>{pl.channel_count}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Filmes (VOD)</Text>
                    <Text style={styles.metricValue}>{pl.movie_count}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Séries</Text>
                    <Text style={styles.metricValue}>{pl.series_count}</Text>
                  </View>
                </View>

                {/* Botões de Ação por Playlist */}
                <View style={styles.cardActions}>
                  {!isActive && (
                    <FocusableItem
                      style={styles.cardBtn}
                      focusedStyle={styles.cardBtnFocused}
                      onPress={() => handleSetActive(pl)}
                    >
                      {(focused) => (
                        <Text style={[styles.cardBtnText, focused && styles.cardBtnTextFocused]}>
                          ✓ Ativar
                        </Text>
                      )}
                    </FocusableItem>
                  )}

                  <FocusableItem
                    style={styles.cardBtn}
                    focusedStyle={styles.cardBtnFocused}
                    onPress={() => handleSyncPlaylist(pl)}
                  >
                    {(focused) => (
                      <Text style={[styles.cardBtnText, focused && styles.cardBtnTextFocused]}>
                        🔄 Sincronizar
                      </Text>
                    )}
                  </FocusableItem>

                  <FocusableItem
                    style={[styles.cardBtn, styles.deleteBtn]}
                    focusedStyle={styles.deleteBtnFocused}
                    onPress={() => handleDeletePlaylist(pl.id)}
                  >
                    {(focused) => (
                      <Text
                        style={[
                          styles.cardBtnText,
                          styles.deleteBtnText,
                          focused && styles.cardBtnTextFocused,
                        ]}
                      >
                        🗑️ Excluir
                      </Text>
                    )}
                  </FocusableItem>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal de Importação com Barra de Progresso em Streaming */}
      <Modal
        visible={isImporting}
        onClose={() => {}}
        title="Importando Playlist no Banco SQLite..."
      >
        <View style={styles.progressModalContent}>
          <ActivityIndicator size="large" color="#38bdf8" style={styles.progressSpinner} />
          <Text style={styles.progressTitle}>
            {importProgress ? `${importProgress.percent}%` : 'Carregando...'}
          </Text>

          {/* Barra de Progresso Visual */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${importProgress ? importProgress.percent : 10}%` },
              ]}
            />
          </View>

          <Text style={styles.progressMessage}>
            {importProgress?.message || 'Processando em segundo plano sem travar a UI...'}
          </Text>

          <Text style={styles.progressSubtext}>
            {importProgress
              ? `${importProgress.importedCount} de ${importProgress.totalEstimated} canais gravados`
              : 'Preparando transações SQLite...'}
          </Text>
        </View>
      </Modal>

      {/* Modal Adicionar Xtream Codes (Com Inputs Totalmente Focalizáveis via D-pad) */}
      <Modal
        visible={isXtreamModalOpen}
        onClose={() => setIsXtreamModalOpen(false)}
        title="Adicionar Conta Xtream Codes"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <FocusableTextInput
            hasTVPreferredFocus={true}
            label="Nome de Identificação:"
            value={xtreamName}
            onChangeText={setXtreamName}
          />

          <FocusableTextInput
            label="URL do Servidor (Host e Porta):"
            value={xtreamServer}
            onChangeText={setXtreamServer}
          />

          <FocusableTextInput
            label="Usuário:"
            value={xtreamUser}
            onChangeText={setXtreamUser}
          />

          <FocusableTextInput
            label="Senha:"
            value={xtreamPass}
            onChangeText={setXtreamPass}
          />

          <View style={styles.modalButtonsRow}>
            <FocusableItem
              style={styles.modalCancelBtn}
              focusedStyle={styles.modalCancelBtnFocused}
              onPress={() => setIsXtreamModalOpen(false)}
            >
              {(focused) => (
                <Text style={[styles.modalCancelText, focused && styles.textFocused]}>
                  Cancelar
                </Text>
              )}
            </FocusableItem>

            <FocusableItem
              style={styles.modalSubmitBtn}
              focusedStyle={styles.topActionCardFocused}
              onPress={handleAddXtream}
            >
              {(focused) => (
                <Text style={[styles.modalSubmitText, focused && styles.textFocused]}>
                  Conectar e Importar
                </Text>
              )}
            </FocusableItem>
          </View>
        </ScrollView>
      </Modal>

      {/* Modal Adicionar M3U URL (Com Inputs Totalmente Focalizáveis via D-pad) */}
      <Modal
        visible={isM3UModalOpen}
        onClose={() => setIsM3UModalOpen(false)}
        title="Adicionar Playlist M3U por URL"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <FocusableTextInput
            hasTVPreferredFocus={true}
            label="Nome da Playlist:"
            value={m3uName}
            onChangeText={setM3uName}
          />

          <FocusableTextInput
            label="URL Completa (M3U / M3U8):"
            value={m3uUrl}
            onChangeText={setM3uUrl}
          />

          <View style={styles.modalButtonsRow}>
            <FocusableItem
              style={styles.modalCancelBtn}
              focusedStyle={styles.modalCancelBtnFocused}
              onPress={() => setIsM3UModalOpen(false)}
            >
              {(focused) => (
                <Text style={[styles.modalCancelText, focused && styles.textFocused]}>
                  Cancelar
                </Text>
              )}
            </FocusableItem>

            <FocusableItem
              style={styles.modalSubmitBtn}
              focusedStyle={styles.topActionCardFocused}
              onPress={handleAddM3UUrl}
            >
              {(focused) => (
                <Text style={[styles.modalSubmitText, focused && styles.textFocused]}>
                  Baixar e Importar
                </Text>
              )}
            </FocusableItem>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    paddingRight: 12,
  },
  topActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  topActionCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1f2937',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  actionCardPrimary: {
    backgroundColor: '#0c2238',
    borderColor: '#0369a1',
  },
  topActionCardFocused: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.03 }],
    elevation: 8,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionCardEmoji: {
    fontSize: 22,
  },
  actionCardTexts: {
    flex: 1,
  },
  actionCardTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionCardDesc: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  textFocused: {
    color: '#ffffff',
    fontWeight: '800',
  },
  statusBanner: {
    backgroundColor: '#0c1a2e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  statusBannerText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  playlistList: {
    flex: 1,
  },
  playlistListContent: {
    paddingBottom: 24,
    gap: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 480,
    lineHeight: 18,
  },
  emptyText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  playlistCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1f2937',
    padding: 16,
  },
  playlistCardActive: {
    borderColor: '#0284c7',
    backgroundColor: '#0a1628',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeBadge: {
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  playlistTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  activeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  updatedDate: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 20,
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  metricValue: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cardBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardBtnFocused: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.05 }],
  },
  cardBtnText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBtnTextFocused: {
    color: '#ffffff',
    fontWeight: '700',
  },
  deleteBtn: {
    borderColor: '#7f1d1d',
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
  },
  deleteBtnFocused: {
    backgroundColor: '#dc2626',
    borderColor: '#f87171',
    transform: [{ scale: 1.05 }],
  },
  deleteBtnText: {
    color: '#f87171',
  },
  progressModalContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  progressSpinner: {
    marginBottom: 16,
  },
  progressTitle: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 16,
  },
  progressBarTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#1e293b',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 5,
  },
  progressMessage: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  progressSubtext: {
    color: '#64748b',
    fontSize: 12,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 14,
  },
  modalCancelBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCancelBtnFocused: {
    backgroundColor: '#334155',
    borderColor: '#94a3b8',
    transform: [{ scale: 1.03 }],
  },
  modalCancelText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
