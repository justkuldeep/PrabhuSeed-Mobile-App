import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { AuthProvider } from '../services/authStore';
import { Colors } from '../constants/theme';
import ErrorBoundary from '../components/ui/ErrorBoundary';

class SafeAreaProviderCompat extends React.Component {
  render() {
    const metrics = initialWindowMetrics ?? {
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
      frame: { x: 0, y: 0, width: 0, height: 0 },
    };
    return (
      <SafeAreaInsetsContext.Provider value={metrics.insets}>
        <SafeAreaFrameContext.Provider value={metrics.frame}>
          {this.props.children}
        </SafeAreaFrameContext.Provider>
      </SafeAreaInsetsContext.Provider>
    );
  }
}

export default class RootLayout extends React.Component {
  render() {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProviderCompat>
          <AuthProvider>
            <StatusBar style="light" backgroundColor={Colors.background} />
            <ErrorBoundary>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: Colors.background },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                <Stack.Screen name="feedback" options={{ animation: 'fade' }} />
                <Stack.Screen
                  name="tasks/[id]"
                  options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="tasks/create"
                  options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
                />
                <Stack.Screen
                  name="admin"
                  options={{ animation: 'slide_from_right' }}
                />
              </Stack>
            </ErrorBoundary>
          </AuthProvider>
        </SafeAreaProviderCompat>
      </GestureHandlerRootView>
    );
  }
}
