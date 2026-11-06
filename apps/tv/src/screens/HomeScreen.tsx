import React, { useState, useEffect } from 'react';
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

export const HomeScreen: React.FC = () => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('live');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [selectedActionMessage, setSelectedActionMessage] = useState<string>(
    'Pressione [OK] em qualquer cartão com o controle remoto para testar.'
  );

  const { lastEvent, eventCount } = useTVRemote();

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

  const getSectionTitle = (section: ActiveSection) => {
    switch (section) {
      case 'live':
        return 'Canais Ao Vivo';
      case 'movies':
        return 'Catálogo de Filmes (VOD)';
      case 'series':
        return 'Séries e Temporadas';
      case 'favorites':
        return 'Favoritos';
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
            <View style={styles.deviceBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.deviceText}>Fire TV Stick (D-Pad)</Text>
            </View>
            <Text style={styles.clockText}>{currentTime}</Text>
          </View>
        </View>

        {/* Dashboard Grid com Navegação D-pad */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Alerta de Feedback de Ação */}
          <View style={styles.actionBanner}>
            <Text style={styles.actionBannerIcon}>⚡</Text>
            <Text style={styles.actionBannerText}>{selectedActionMessage}</Text>
          </View>

          {/* Linha de Cartões 1 */}
          <View style={styles.cardRow}>
            {/* Cartão 1: Status de Playlists */}
            <FocusableItem
              style={styles.card}
              focusedStyle={styles.cardFocused}
              onPress={() =>
                setSelectedActionMessage('Ação: Gerenciador de Playlists será ativado na Etapa 3!')
              }
            >
              {(focused) => (
                <View style={styles.cardInner}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTag}>ETAPA 3</Text>
                    <Text style={styles.cardEmoji}>📂</Text>
                  </View>
                  <Text style={[styles.cardTitle, focused && styles.cardTitleFocused]}>
                    Playlists M3U & Xtream
                  </Text>
                  <Text style={styles.cardDesc}>
                    Pronto para suporte a múltiplos servidores e importação em streaming de 50k+ canais.
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardStatusText}>Status: 0 Conectadas</Text>
                  </View>
                </View>
              )}
            </FocusableItem>

            {/* Cartão 2: Motores de Vídeo */}
            <FocusableItem
              style={styles.card}
              focusedStyle={styles.cardFocused}
              onPress={() =>
                setSelectedActionMessage('Ação: Motores Media3/ExoPlayer e LibVLC serão configurados na Etapa 5!')
              }
            >
              {(focused) => (
                <View style={styles.cardInner}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTag}>PLAYER</Text>
                    <Text style={styles.cardEmoji}>▶️</Text>
                  </View>
                  <Text style={[styles.cardTitle, focused && styles.cardTitleFocused]}>
                    Media3 & LibVLC
                  </Text>
                  <Text style={styles.cardDesc}>
                    HLS adaptativo, MPEG-TS nativo, decodificação MediaCodec HW e fallback para VLC.
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardStatusText}>Modo: Hardware (Auto)</Text>
                  </View>
                </View>
              )}
            </FocusableItem>
          </View>

          {/* Linha de Cartões 2 */}
          <View style={styles.cardRow}>
            {/* Cartão 3: Validador de D-pad ao Vivo */}
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

            {/* Cartão 4: Otimizações MXQ 4K / Fire TV */}
            <FocusableItem
              style={styles.card}
              focusedStyle={styles.cardFocused}
              onPress={() =>
                setSelectedActionMessage('Perfil de baixo consumo de RAM e arquitetura 32-bit armeabi-v7a ativos.')
              }
            >
              {(focused) => (
                <View style={styles.cardInner}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTag}>HARDWARE</Text>
                    <Text style={styles.cardEmoji}>🚀</Text>
                  </View>
                  <Text style={[styles.cardTitle, focused && styles.cardTitleFocused]}>
                    Perfil de Desempenho
                  </Text>
                  <Text style={styles.cardDesc}>
                    Package: br.com.mtrsistemas.iptv | ABI: armeabi-v7a | Hermes Engine Ativo.
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardStatusText}>Memória: Otimizada</Text>
                  </View>
                </View>
              )}
            </FocusableItem>
          </View>
        </ScrollView>

        {/* Rodapé com Dicas do Controle Remoto */}
        <View style={styles.footerBar}>
          <View style={styles.keyPrompt}>
            <Text style={styles.keyBadge}>▲▼◀▶</Text>
            <Text style={styles.keyText}>Navegar</Text>
          </View>
          <View style={styles.keyPrompt}>
            <Text style={styles.keyBadge}>OK</Text>
            <Text style={styles.keyText}>Selecionar</Text>
          </View>
          <View style={styles.keyPrompt}>
            <Text style={styles.keyBadge}>VOLTAR</Text>
            <Text style={styles.keyText}>Sair</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#07090e',
  },
  contentArea: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 28,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  deviceText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  clockText: {
    color: '#94a3b8',
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1a2e',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 18,
  },
  actionBannerIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  actionBannerText: {
    color: '#7dd3fc',
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
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1f2937',
  },
  cardFocused: {
    borderColor: '#38bdf8',
    backgroundColor: '#0f233d',
    transform: [{ scale: 1.02 }],
  },
  cardInner: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    letterSpacing: 0.8,
  },
  cardEmoji: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 6,
  },
  cardTitleFocused: {
    color: '#ffffff',
  },
  cardDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 14,
  },
  highlightText: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingTop: 8,
  },
  cardStatusText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  keyPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyBadge: {
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  keyText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
});

