import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FocusableItem } from './FocusableItem';
import { ActiveSection, TVNavigationItem } from '../types/navigation';

interface SideMenuProps {
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
}

const MENU_ITEMS: (TVNavigationItem & { key: ActiveSection })[] = [
  { key: 'live', id: 'nav-live', title: 'Canais Ao Vivo', icon: '📺' },
  { key: 'movies', id: 'nav-movies', title: 'Filmes', icon: '🎬' },
  { key: 'series', id: 'nav-series', title: 'Séries', icon: '🍿' },
  { key: 'favorites', id: 'nav-favorites', title: 'Favoritos', icon: '⭐' },
  { key: 'search', id: 'nav-search', title: 'Buscar', icon: '🔍' },
  { key: 'epg', id: 'nav-epg', title: 'Guia de TV (EPG)', icon: '📅' },
  { key: 'playlists', id: 'nav-playlists', title: 'Playlists', icon: '📂' },
  { key: 'settings', id: 'nav-settings', title: 'Configurações', icon: '⚙️' },
];

export const SideMenu: React.FC<SideMenuProps> = ({
  activeSection,
  onSelectSection,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.brandHeader}>
        <Text style={styles.brandBadge}>IPTV</Text>
        <Text style={styles.brandTitle}>MTR</Text>
      </View>

      <View style={styles.menuList}>
        {MENU_ITEMS.map((item, index) => {
          const isActive = activeSection === item.key;
          return (
            <FocusableItem
              key={item.id}
              hasTVPreferredFocus={index === 0}
              onPress={() => onSelectSection(item.key)}
              style={[styles.menuItem, isActive && styles.activeMenuItem]}
              focusedStyle={styles.focusedMenuItem}
            >
              {(focused) => (
                <View style={styles.itemContent}>
                  <Text style={styles.itemIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.itemText,
                      isActive && styles.activeItemText,
                      focused && styles.focusedItemText,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {isActive && <View style={styles.activePill} />}
                </View>
              )}
            </FocusableItem>
          );
        })}
      </View>

      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>v1.0.0-alpha • Etapa 2</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 260,
    backgroundColor: '#0b0f17',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  brandBadge: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
    letterSpacing: 1,
  },
  brandTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  menuList: {
    flex: 1,
    gap: 8,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  activeMenuItem: {
    backgroundColor: '#1e293b',
  },
  focusedMenuItem: {
    backgroundColor: '#0369a1',
    borderColor: '#38bdf8',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  itemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#94a3b8',
    flex: 1,
  },
  activeItemText: {
    color: '#f1f5f9',
    fontWeight: '600',
  },
  focusedItemText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  activePill: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#38bdf8',
    marginLeft: 6,
  },
  versionContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
});

