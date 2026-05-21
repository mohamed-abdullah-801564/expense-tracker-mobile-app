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
import { View, ActivityIndicator, Animated, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRef, useEffect, useState } from 'react';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import FeedbackModal from '@/components/FeedbackModal';
import { useExpenses } from '@/hooks/expense-store';

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
  const [showButton, setShowButton] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (isDataReady) {
      timeoutId = setTimeout(() => {
        setShowButton(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 1500);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isDataReady, fadeAnim]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      <Image 
        source={require('../assets/images/splash-icon.png')} 
        style={StyleSheet.absoluteFill} 
        contentFit="cover"
        priority="high"
      />
      {showButton && (
        <Animated.View style={{ opacity: fadeAnim, position: 'absolute', bottom: 50, alignSelf: 'center' }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              paddingHorizontal: 40,
              paddingVertical: 16,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={onStart}
          >
            <Text style={{ color: '#7C3AED', fontWeight: '700', fontSize: 18 }}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

function AppContent() {
  const { isLoading: isThemeLoading } = useTheme();
  const { isLoading: isExpensesLoading } = useExpenses();
  const { isLoading: isFirstTimeLoading, markGuideAsSeen } = useFirstTime();
  const { isLoading: isNotificationsLoading } = useNotifications();

  const [hasStarted, setHasStarted] = useState(false);

  const isDataReady = !isExpensesLoading && !isThemeLoading && !isFirstTimeLoading && !isNotificationsLoading;

  if (!hasStarted) {
    return (
      <LaunchScreen 
        isDataReady={isDataReady} 
        onStart={() => {
          setHasStarted(true);
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
