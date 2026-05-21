import { Tabs } from "expo-router";
import { Wallet, History, Settings, Users, PieChart } from "lucide-react-native";
import React from "react";
import { useTheme } from '@/hooks/theme-store';
import { View } from 'react-native';
import { TapGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useExpenses } from '@/hooks/expense-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const theme = useTheme();
  const { toggleAiModal } = useExpenses();
  const insets = useSafeAreaInsets();
  // Provide safe defaults in case theme or colors are undefined during initial render
  const colors = theme?.colors || {
    primary: '#4F46E5',
    textSecondary: '#6B7280',
    tabBarBackground: '#FFFFFF',
    border: '#E5E7EB',
    headerBackground: '#FFFFFF',
    text: '#1F2937',
  };

  const onHandlerStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) {
        toggleAiModal();
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TapGestureHandler
        numberOfTaps={2}
        onHandlerStateChange={onHandlerStateChange}
      >
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              headerStatusBarHeight: insets.top,
              tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 10,
        },
        headerStyle: {
          backgroundColor: colors.headerBackground,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
          color: colors.text,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Expenses",
          tabBarIcon: ({ color }) => <Wallet size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => <History size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color }) => <PieChart size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
        </View>
      </TapGestureHandler>
    </GestureHandlerRootView>
  );
}