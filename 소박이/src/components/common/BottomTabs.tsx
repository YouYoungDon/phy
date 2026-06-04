import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@granite-js/react-native';
import { COLORS } from '../../constants/colors';

const TABS = [
  { label: '홈', icon: '🏠', route: '/' },
  { label: '기록', icon: '✏️', route: '/record' },
  { label: '통계', icon: '📊', route: '/stats' },
] as const;

type TabRoute = (typeof TABS)[number]['route'];

interface BottomTabsProps {
  activeRoute?: TabRoute;
}

export function BottomTabs({ activeRoute }: BottomTabsProps) {
  const navigation = useNavigation();
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.route === activeRoute;
        return (
          <Pressable
            key={tab.route}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => {
              if (isActive) return;
              // Tabs SWITCH, they don't stack. On a native-stack router,
              // navigate() pushes any route not already in the stack, so
              // hopping between tabs would accumulate screens and let
              // hardware-back walk the history. Collapse to the home base
              // first, then push the target once (or just land on home).
              navigation.popToTop();
              if (tab.route !== '/') navigation.navigate(tab.route);
            }}
          >
            <Text style={styles.icon}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.warmWhite,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 24,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  tabActive: {
    borderTopColor: COLORS.oliveGreen,
  },
  icon: {
    fontSize: 22,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.oliveGreen,
    fontWeight: '700',
  },
});
