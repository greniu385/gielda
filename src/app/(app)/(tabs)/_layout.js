import { Platform } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../../theme/ThemeContext';

const TABS = [
  { name: 'index', title: 'Rynek', icon: 'stats-chart' },
  { name: 'wallet', title: 'Portfel', icon: 'wallet' },
  { name: 'history', title: 'Historia', icon: 'receipt' },
  { name: 'profile', title: 'Profil', icon: 'person-circle' },
];

export default function TabsLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...Platform.select({ web: { height: 64, paddingBottom: 8 } }),
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? tab.icon : `${tab.icon}-outline`} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
