/**
 * Dynamic Activity Form Screen — Field Data Entry Module
 * Renders form fields dynamically from API attributes.
 * Supports Submit More workflow and offline-first submission.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import DynamicFieldRenderer from '../../components/feedback/DynamicFieldRenderer';
import { useActivityAttributes, useFeedbackSubmit, useDraft } from '../../hooks/useFeedback';

// ─── Fixed core fields ────────────────────────────────────────────────────────
// These are always shown regardless of activity-specific attributes
const CORE_FIELDS = [
  { field_key: 'farmer_name', label: 'Farmer Name', field_type: 'text', is_required: true, placeholder: 'Enter farmer name' },
  { field_key: 'farmer_phone', label: 'Mobile Number', field_type: 'text', is_required: false, placeholder: '10-digit mobile number' },
  { field_key: 'village', label: 'Village / Location', field_type: 'text', is_required: false, placeholder: 'Village name' },
  { field_key: '_gps', label: 'GPS Location', field_type: 'gps', is_required: false, placeholder: '' },
];

// ─── Success toast ────────────────────────────────────────────────────────────

function SuccessToast({ message, visible }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Field skeleton ────────────────────────────────────────────────────────────

function FieldSkeleton() {
  return (
    <View style={styles.fieldSkeletonWrap}>
      <View style={[styles.skeletonLine, { width: '40%', height: 12, marginBottom: 8 }]} />
      <View style={[styles.skeletonLine, { height: 48 }]} />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ActivityFormScreen() {
  const { activityId, name, dept } = useLocalSearchParams();
  const router = useRouter();

  const { attributes, loading: attrsLoading, error: attrsError, refetch } = useActivityAttributes(Number(activityId));
  const { submit, submitting } = useFeedbackSubmit();
  const { autosave, restoreDraft } = useDraft(activityId);

  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const scrollRef = useRef(null);

  // Fetch attributes on mount
  useEffect(() => { refetch(); }, []);

  // Restore draft on mount
  useEffect(() => {
    restoreDraft()
      .then((draft) => { if (draft?.values) setValues(draft.values); })
      .catch(() => {}); // ignore corrupted / missing draft
  }, []);

  const setValue = useCallback((key, val) => {
    setValues((prev) => {
      const next = { ...prev, [key]: val };
      autosave(next);
      return next;
    });
    // Clear error on change
    setErrors((prev) => {
      if (prev[key]) { const e = { ...prev }; delete e[key]; return e; }
      return prev;
    });
  }, [autosave]);

  const validate = useCallback(() => {
    const errs = {};

    // Validate core fields
    CORE_FIELDS.forEach((f) => {
      if (f.is_required && !values[f.field_key]?.toString().trim()) {
        errs[f.field_key] = `${f.label} is required`;
      }
    });

    // Validate dynamic attributes
    attributes.forEach((attr) => {
      if (!attr.is_required) return;
      const val = values[attr.field_key];
      const isEmpty = val == null || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0);
      if (isEmpty) {
        errs[attr.field_key] = `${attr.label} is required`;
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [values, attributes]);

  const buildPayload = useCallback(() => {
    const responses = [];

    attributes.forEach((attr) => {
      const val = values[attr.field_key];
      if (val == null || val === '') return;

      if (attr.field_type === 'gps') {
        responses.push({ field_key: attr.field_key, value_json: val });
      } else if (attr.field_type === 'image') {
        // Images stored as array of URIs in value_json
        const uris = Array.isArray(val) ? val : [val];
        responses.push({ field_key: attr.field_key, value_json: { uris } });
      } else if (attr.field_type === 'multi_select') {
        responses.push({ field_key: attr.field_key, value_json: val });
      } else if (['number', 'decimal'].includes(attr.field_type)) {
        responses.push({ field_key: attr.field_key, value_text: String(val), value_json: { number: parseFloat(val) } });
      } else if (['checkbox', 'toggle'].includes(attr.field_type)) {
        responses.push({ field_key: attr.field_key, value_json: { bool: !!val } });
      } else {
        responses.push({ field_key: attr.field_key, value_text: String(val) });
      }
    });

    // Include GPS core field
    if (values['_gps']) {
      responses.push({ field_key: 'gps_location', value_json: values['_gps'] });
    }

    return {
      activity_type_id: Number(activityId),
      farmer_name: (values['farmer_name'] || '').trim(),
      farmer_phone: values['farmer_phone'] || null,
      village: values['village'] || null,
      location_lat: values['_gps']?.lat || null,
      location_lng: values['_gps']?.lng || null,
      responses,
    };
  }, [activityId, values, attributes]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    const payload = buildPayload();
    const result = await submit(payload, {
      onSuccess: () => {
        setSubmitCount((c) => c + 1);
        showToast('Submitted successfully!');
        resetFormValues();
      },
      onQueued: () => {
        setSubmitCount((c) => c + 1);
        showToast('Saved offline — will sync when connected');
        resetFormValues();
      },
      onError: (err) => {
        Alert.alert('Submission Failed', err.message || 'Please try again.');
      },
    });
  }, [validate, buildPayload, submit]);

  const resetFormValues = useCallback(() => {
    // Submit More: keep activity context, reset form values only
    setValues({});
    setErrors({});
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(false);
    setTimeout(() => setToastVisible(true), 50);
  }, []);

  const allFields = [...CORE_FIELDS, ...(attributes || [])];
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{name || 'Activity Form'}</Text>
          {dept ? <Text style={styles.headerDept}>{dept}</Text> : null}
        </View>
        {submitCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{submitCount}</Text>
          </View>
        )}
      </View>

      {/* Submit More hint */}
      {submitCount > 0 && (
        <View style={styles.submitMoreBanner}>
          <Text style={styles.submitMoreText}>
            ✓ {submitCount} submission{submitCount > 1 ? 's' : ''} recorded — form reset for next entry
          </Text>
        </View>
      )}

      {/* Error summary */}
      {hasErrors && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Please fill in all required fields</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Core fields section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Farmer Details</Text>
            {CORE_FIELDS.map((field) => (
              <DynamicFieldRenderer
                key={field.field_key}
                attribute={field}
                value={values[field.field_key]}
                onChange={(val) => setValue(field.field_key, val)}
                error={errors[field.field_key]}
              />
            ))}
          </View>

          {/* Dynamic activity fields */}
          {attrsLoading ? (
            <View style={styles.section}>
              <View style={[styles.skeletonLine, { width: '50%', height: 16, marginBottom: Spacing.base }]} />
              {[1, 2, 3].map((i) => <FieldSkeleton key={i} />)}
            </View>
          ) : attrsError ? (
            <View style={styles.attrsError}>
              <Text style={styles.attrsErrorText}>Could not load activity fields</Text>
              <TouchableOpacity onPress={refetch}>
                <Text style={styles.attrsRetry}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          ) : attributes.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Activity Details</Text>
              {attributes.map((attr) => (
                <DynamicFieldRenderer
                  key={attr.id}
                  attribute={attr}
                  value={values[attr.field_key]}
                  onChange={(val) => setValue(attr.field_key, val)}
                  error={errors[attr.field_key]}
                />
              ))}
            </View>
          ) : (
            <View style={styles.noAttrsNote}>
              <Text style={styles.noAttrsText}>No additional fields configured for this activity</Text>
            </View>
          )}

          {/* Notes field always at bottom */}
          <View style={styles.section}>
            <DynamicFieldRenderer
              attribute={{ field_key: '_notes', label: 'Additional Notes', field_type: 'textarea', is_required: false, placeholder: 'Any remarks, observations…' }}
              value={values['_notes']}
              onChange={(val) => setValue('_notes', val)}
              error={null}
            />
          </View>

          {/* Bottom padding */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky submit bar */}
      <View style={styles.submitBar}>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={resetFormValues}
          disabled={submitting}
        >
          <Text style={styles.resetText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.textInverse} size="small" />
          ) : (
            <Text style={styles.submitText}>Submit & Next</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Toast */}
      <SuccessToast message={toastMsg} visible={toastVisible} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: Colors.textPrimary,
  },
  headerInfo: { flex: 1 },
  headerTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  headerDept: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  countBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textInverse,
  },

  // Banners
  submitMoreBanner: {
    backgroundColor: Colors.successMuted,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  submitMoreText: {
    fontSize: Typography.sm,
    color: Colors.success,
    fontWeight: Typography.medium,
  },
  errorBanner: {
    backgroundColor: Colors.errorMuted,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  errorBannerText: {
    fontSize: Typography.sm,
    color: Colors.error,
    fontWeight: Typography.medium,
  },

  // Scroll
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    margin: Spacing.base,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.base,
  },

  // Skeleton
  fieldSkeletonWrap: { marginBottom: Spacing.base },
  skeletonLine: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    width: '100%',
  },

  // Attrs error
  attrsError: {
    margin: Spacing.base,
    padding: Spacing.base,
    backgroundColor: Colors.errorMuted,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  attrsErrorText: { color: Colors.error, fontSize: Typography.sm, marginBottom: Spacing.sm },
  attrsRetry: { color: Colors.error, fontWeight: Typography.bold, textDecorationLine: 'underline' },

  noAttrsNote: {
    margin: Spacing.base,
    padding: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  noAttrsText: { color: Colors.textMuted, fontSize: Typography.sm },

  // Submit bar
  submitBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.base : Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  resetBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    color: Colors.textSecondary,
    fontWeight: Typography.semibold,
    fontSize: Typography.base,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.green,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: Colors.textInverse,
    fontWeight: Typography.bold,
    fontSize: Typography.base,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  toastText: {
    color: Colors.textInverse,
    fontWeight: Typography.semibold,
    fontSize: Typography.base,
  },
});
