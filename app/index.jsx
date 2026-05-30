/**
 * Entry point — redirects to auth or main tabs based on session.
 *
 * CLASS component intentionally — no hooks, zero risk of null-dispatcher
 * crash under New Architecture Suspense boundaries.
 *
 * Expected flow (per Expo Router docs):
 *   Root Layout mounts → Index renders → auth loads → navigate
 *
 * Navigation rules:
 *   ✅ Only navigates in componentDidUpdate (never on first render)
 *   ✅ Always waits for loading === false before navigating
 *   ✅ Returns <LoadingSpinner> while auth state is loading
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AuthContext } from '../services/authStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Colors } from '../constants/theme';

class IndexInner extends React.Component {
  componentDidUpdate(prevProps) {
    const { isAuthenticated, loading } = this.props;
    // Only navigate when loading transitions from true→false
    if (!loading && prevProps.loading) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }

  render() {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <LoadingSpinner fullScreen message="" />
      </View>
    );
  }
}

export default class Index extends React.Component {
  render() {
    return (
      <AuthContext.Consumer>
        {({ isAuthenticated, loading }) => (
          <IndexInner isAuthenticated={isAuthenticated} loading={loading} />
        )}
      </AuthContext.Consumer>
    );
  }
}
