/**
 * Entry point — redirects to auth or main tabs based on session
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../services/authStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Colors } from '../constants/theme';

export default function Index() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [loading, isAuthenticated]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LoadingSpinner fullScreen message="" />
    </View>
  );
}
