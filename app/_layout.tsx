import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/hooks/theme-store';
import { NotificationProvider } from '@/hooks/notification-store';
import { ExpenseProvider } from '@/hooks/expense-store';
import { SplitExpenseProvider } from '@/hooks/split-expense-store';
import { FirstTimeProvider, useFirstTime } from '@/hooks/first-time-store';
import { useNotifications } from '@/hooks/notification-store';
import { View, ActivityIndicator, Animated, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRef, useEffect, useState } from 'react';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import FeedbackModal from '@/components/FeedbackModal';
import { useExpenses } from '@/hooks/expense-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HowItWorksScreen from '@/components/HowItWorksScreen';
import CurrencyPicker from '@/components/CurrencyPicker';

function GlobalModals() {
  const { isFeedbackModalVisible, setFeedbackModalVisible } = useExpenses();
  return (
    <FeedbackModal 
      visible={isFeedbackModalVisible} 
      onClose={() => setFeedbackModalVisible(false)} 
    />
  );
}

function GlobalStatusBar() {
  const { isDarkMode } = useTheme();
  return <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} />;
}

function LaunchScreen({ isDataReady, onStart }: { isDataReady: boolean, onStart: () => void }) {
  const [showContent, setShowContent] = useState(false);
  const [selectedCountryName, setSelectedCountryName] = useState<string>('India');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { colors, isDarkMode, updateCurrencyCountryName } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isDataReady) {
      setShowContent(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isDataReady]);

  const handleStart = () => {
    updateCurrencyCountryName(selectedCountryName);
    onStart();
  };

  if (!showContent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
      >
        <HowItWorksScreen scrollEnabled={false} />
        
        <Animated.View style={{ 
          opacity: fadeAnim, 
          width: '100%', 
          padding: 24, 
          alignItems: 'center', 
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          marginTop: 20
        }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 16 }}>
            Select your primary currency
          </Text>
          <View style={{ width: '100%', maxWidth: 320, marginBottom: 28 }}>
            <CurrencyPicker
              selectedCountryName={selectedCountryName}
              onSelectCountryName={setSelectedCountryName}
            />
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 16,
              paddingVertical: 18,
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              maxWidth: 320,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
            onPress={handleStart}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 18 }}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function AppContent() {
  const { isLoading: isThemeLoading } = useTheme();
  const { isLoading: isExpensesLoading } = useExpenses();
  const { isLoading: isFirstTimeLoading, markGuideAsSeen, hasSeenGuide } = useFirstTime();
  const { isLoading: isNotificationsLoading } = useNotifications();

  const isDataReady = !isExpensesLoading && !isThemeLoading && !isFirstTimeLoading && !isNotificationsLoading;

  if (!isDataReady || !hasSeenGuide) {
    return (
      <LaunchScreen 
        isDataReady={isDataReady} 
        onStart={() => {
          markGuideAsSeen();
        }} 
      />
    );
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <GlobalStatusBar />
      <FloatingAIAssistant />
      <GlobalModals />
    </>
  );
}

export const unstable_settings = {
  anchor: '(tabs)',
};

const queryClient = new QueryClient();

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'functionality is not fully supported in Expo Go',
]);

import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might cause this to error */
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        // For now, we just simulate a small delay or wait for context to be ready
        // In a real app, you might use useFonts here.
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately! If we need a delay, we could do it here.
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppThemeProvider>
          <ExpenseProvider>
            <NotificationProvider>
              <SplitExpenseProvider>
                <FirstTimeProvider>
                  <AppContent />
                </FirstTimeProvider>
              </SplitExpenseProvider>
            </NotificationProvider>
          </ExpenseProvider>
        </AppThemeProvider>
      </NavigationThemeProvider>
    </QueryClientProvider>
  );
}
