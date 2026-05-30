/**
 * Login Screen — Employee ID / Mobile / Email + Password
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { authAPI } from '../../services/api';
import { useAuth } from '../../services/authStore';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    const id = identifier.trim();
    if (!id) {
      setError('Enter your Employee ID, mobile number, or email');
      return;
    }
    if (!password) {
      setError('Enter your password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(id, password);
      await login(res.data);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Brand */}
        <View style={styles.brand}>
          <LinearGradient
            colors={['#22c55e', '#16a34a']}
            style={styles.logoCircle}
          >
            <Text style={styles.logoEmoji}>🌾</Text>
          </LinearGradient>
          <Text style={styles.appName}>AgriTask</Text>
          <Text style={styles.tagline}>PGA Field Management</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>
            Sign in with your Employee ID and password
          </Text>

          <Input
            label="Employee ID / Mobile / Email"
            value={identifier}
            onChangeText={(v) => {
              setIdentifier(v);
              setError('');
            }}
            placeholder="e.g. 1  or  9876543210"
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            error={identifier ? '' : error && !password ? error : ''}
            hint="Enter your employee ID, mobile number, or email"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setError('');
            }}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            error={error}
            rightIcon={<Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>}
            onRightIconPress={() => setShowPassword((s) => !s)}
          />

          <Button
            title={loading ? 'Signing in…' : 'Sign In'}
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.submitBtn}
          />
        </View>

        <Text style={styles.footer}>
          PGA AgriTask · Secure Login
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.base,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: Typography.display,
    fontWeight: Typography.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  eyeIcon: {
    fontSize: 18,
  },
  submitBtn: {
    marginTop: Spacing.md,
  },
  footer: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
  },
});
