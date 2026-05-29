/**
 * ErrorBoundary — catches any JS render crash and shows the error
 * on screen instead of silently closing the app.
 * Only active in standalone builds; Expo Go already shows red screens.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
  }

  render() {
    if (this.state.error) {
      const message = this.state.error?.message || String(this.state.error);
      const stack = this.state.info?.componentStack || this.state.error?.stack || '';

      return (
        <View style={styles.container}>
          <Text style={styles.title}>❌ App Crash</Text>
          <Text style={styles.subtitle}>Copy this and send to developer:</Text>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.errorTitle}>Error:</Text>
            <Text style={styles.errorText} selectable>{message}</Text>

            <Text style={styles.errorTitle}>Stack:</Text>
            <Text style={styles.errorText} selectable>{stack}</Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => {
              Share.share({ message: `ERROR: ${message}\n\nSTACK:${stack}` }).catch(() => {});
            }}
          >
            <Text style={styles.copyBtnText}>📤 Share Error Log</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    marginBottom: 16,
  },
  scrollContent: {
    padding: 14,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  copyBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  copyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
