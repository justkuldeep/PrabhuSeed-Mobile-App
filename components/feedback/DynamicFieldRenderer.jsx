/**
 * Dynamic form field renderer.
 * Renders any field type based on the `attribute` definition from the API.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  Image,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

// ─── Label ────────────────────────────────────────────────────────────────────

function FieldLabel({ label, required }) {
  return (
    <Text style={styles.label}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

function FieldError({ error }) {
  if (!error) return null;
  return <Text style={styles.errorText}>{error}</Text>;
}

// ─── Text / Textarea ──────────────────────────────────────────────────────────

function TextField({ attribute, value, onChange, error }) {
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel label={attribute.label} required={attribute.is_required} />
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value || ''}
        onChangeText={onChange}
        placeholder={attribute.placeholder || `Enter ${attribute.label.toLowerCase()}`}
        placeholderTextColor={Colors.textMuted}
        returnKeyType="next"
      />
      <FieldError error={error} />
    </View>
  );
}

function TextareaField({ attribute, value, onChange, error }) {
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel label={attribute.label} required={attribute.is_required} />
      <TextInput
        style={[styles.input, styles.textarea, error && styles.inputError]}
        value={value || ''}
        onChangeText={onChange}
        placeholder={attribute.placeholder || `Enter ${attribute.label.toLowerCase()}`}
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <FieldError error={error} />
    </View>
  );
}

// ─── Number / Decimal ─────────────────────────────────────────────────────────

function NumberField({ attribute, value, onChange, error, decimal = false }) {
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel label={attribute.label} required={attribute.is_required} />
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value != null ? String(value) : ''}
        onChangeText={(t) => onChange(t)}
        placeholder={attribute.placeholder || '0'}
        placeholderTextColor={Colors.textMuted}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        returnKeyType="next"
      />
      <FieldError error={error} />
    </View>
  );
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function DropdownField({ attribute, value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const options = attribute.options?.choices || [];
  const selected = options.find((o) => (typeof o === 'string' ? o : o.value) === value);
  const displayLabel = selected ? (typeof selected === 'string' ? selected : selected.label) : null;

  return (
    <View style={styles.fieldWrap}>
      <FieldLabel label={attribute.label} required={attribute.is_required} />
      <TouchableOpacity
        style={[styles.input, styles.dropdown, error && styles.inputError]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={displayLabel ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {displayLabel || attribute.placeholder || `Select ${attribute.label}`}
        </Text>
        <Text style={styles.dropdownChevron}>▾</Text>
      </TouchableOpacity>
      <FieldError error={error} />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{attribute.label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item, i) => String(i)}
              renderItem={({ item }) => {
                const val = typeof item === 'string' ? item : item.value;
                const lbl = typeof item === 'string' ? item : item.label;
                const active = val === value;
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, active && styles.optionRowActive]}
                    onPress={() => { onChange(val); setOpen(false); }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{lbl}</Text>
                    {active && <Text style={styles.optionCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Multi-select ─────────────────────────────────────────────────────────────

function MultiSelectField({ attribute, value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const options = attribute.options?.choices || [];
  const selected = Array.isArray(value) ? value : [];

  const toggle = (val) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(next);
  };

  return (
    <View style={styles.fieldWrap}>
      <FieldLabel label={attribute.label} required={attribute.is_required} />
      <TouchableOpacity
        style={[styles.input, styles.dropdown, error && styles.inputError]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={selected.length ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
          {selected.length ? selected.join(', ') : (attribute.placeholder || `Select ${attribute.label}`)}
        </Text>
        <Text style={styles.dropdownChevron}>▾</Text>
      </TouchableOpacity>
      <FieldError error={error} />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{attribute.label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item, i) => String(i)}
              renderItem={({ item }) => {
                const val = typeof item === 'string' ? item : item.value;
                const lbl = typeof item === 'string' ? item : item.label;
                const active = selected.includes(val);
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, active && styles.optionRowActive]}
                    onPress={() => toggle(val)}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{lbl}</Text>
                    <View style={[styles.checkbox, active && styles.checkboxActive]}>
                      {active && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.modalDone} onPress={() => setOpen(false)}>
              <Text style={styles.modalDoneText}>Done ({selected.length} selected)</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Checkbox (single boolean) ────────────────────────────────────────────────

function CheckboxField({ attribute, value, onChange, error }) {
  return (
    <View style={styles.fieldWrap}>
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => onChange(!value)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, value && styles.checkboxActive]}>
          {value && <Text style={styles.checkboxTick}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>
          {attribute.label}
          {attribute.is_required && <Text style={styles.required}> *</Text>}
        </Text>
      </TouchableOpacity>
      <FieldError error={error} />
    </View>
  );
}

// ─── Radio ────────────────────────────────────────────────────────────────────

function RadioField({ attribute, value, onChange, error }) {
  const options = attribute.options?.choices || [];
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel label={attribute.label} required={attribute.is_required} />
      {options.map((item, i) => {
        const val = typeof item === 'string' ? item : item.value;
        const lbl = typeof item === 'string' ? item : item.label;
        const active = val === value;
        return (
          <TouchableOpacity
            key={i}
            style={styles.radioRow}
            onPress={() => onChange(val)}
            activeOpacity={0.7}
          >
            <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
              {active && <View style={styles.radioInner} />}
            </View>
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{lbl}</Text>
          </TouchableOpacity>
        );
      })}
      <FieldError error={error} />
    </View>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function ToggleField({ attribute, value, onChange, error }) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.toggleRow}>
        <Text style={styles.label}>{attribute.label}</Text>
        <Switch
          value={!!value}
          onValueChange={onChange}
          trackColor={{ false: Colors.inputBorder, true: Colors.primary }}
          thumbColor={value ? Colors.primaryLight : Colors.textMuted}
        />
      </View>
      <FieldError error={error} />
    </View>
  );
}

// ─── Date / Time ──────────────────────────────────────────────────────────────

function DateField({ attribute, value, onChange, error }) {
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel label={attribute.label} required={attribute.is_required} />
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value || ''}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={Colors.textMuted}
        keyboardType="numbers-and-punctuation"
      />
      <FieldError error={error} />
    </View>
  );
}

function TimeField({ attribute, value, onChange, error }) {
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel label={attribute.label} required={attribute.is_required} />
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value || ''}
        onChangeText={onChange}
        placeholder="HH:MM"
        placeholderTextColor={Colors.textMuted}
        keyboardType="numbers-and-punctuation"
      />
      <FieldError error={error} />
    </View>
  );
}

// ─── Image ────────────────────────────────────────────────────────────────────

function ImageField({ attribute, value, onChange, error }) {
  const [picking, setPicking] = useState(false);
  const uris = Array.isArray(value) ? value : value ? [value] : [];

  const pick = async () => {
    setPicking(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { setPicking(false); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.length) {
        const newUri = result.assets[0].uri;
        onChange([...uris, newUri]);
      }
    } finally {
      setPicking(false);
    }
  };

  const camera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (!result.canceled && result.assets?.length) {
      onChange([...uris, result.assets[0].uri]);
    }
  };

  const remove = (idx) => onChange(uris.filter((_, i) => i !== idx));

  return (
    <View style={styles.fieldWrap}>
      <FieldLabel label={attribute.label} required={attribute.is_required} />
      <View style={styles.imageGrid}>
        {uris.map((uri, idx) => (
          <View key={idx} style={styles.imageTile}>
            <Image source={{ uri }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.imageRemove} onPress={() => remove(idx)}>
              <Text style={styles.imageRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.imageButtons}>
          <TouchableOpacity style={styles.imageBtn} onPress={camera} disabled={picking}>
            <Text style={styles.imageBtnIcon}>📷</Text>
            <Text style={styles.imageBtnLabel}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageBtn} onPress={pick} disabled={picking}>
            <Text style={styles.imageBtnIcon}>🖼️</Text>
            <Text style={styles.imageBtnLabel}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FieldError error={error} />
    </View>
  );
}

// ─── GPS ──────────────────────────────────────────────────────────────────────

function GPSField({ attribute, value, onChange, error }) {
  const [fetching, setFetching] = useState(false);
  const hasCoords = value?.lat != null && value?.lng != null;

  const capture = async () => {
    setFetching(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setFetching(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      onChange({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } finally {
      setFetching(false);
    }
  };

  return (
    <View style={styles.fieldWrap}>
      <FieldLabel label={attribute.label} required={attribute.is_required} />
      <TouchableOpacity
        style={[styles.gpsButton, hasCoords && styles.gpsButtonActive]}
        onPress={capture}
        disabled={fetching}
        activeOpacity={0.7}
      >
        <Text style={styles.gpsIcon}>📍</Text>
        <Text style={styles.gpsText}>
          {fetching
            ? 'Getting location…'
            : hasCoords
              ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
              : 'Tap to capture GPS'}
        </Text>
        {hasCoords && (
          <TouchableOpacity onPress={() => onChange(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.gpsRemove}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      <FieldError error={error} />
    </View>
  );
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export default function DynamicFieldRenderer({ attribute, value, onChange, error }) {
  const props = { attribute, value, onChange, error };

  switch (attribute.field_type) {
    case 'text':        return <TextField {...props} />;
    case 'number':      return <NumberField {...props} />;
    case 'decimal':     return <NumberField {...props} decimal />;
    case 'textarea':    return <TextareaField {...props} />;
    case 'dropdown':    return <DropdownField {...props} />;
    case 'multi_select': return <MultiSelectField {...props} />;
    case 'checkbox':    return <CheckboxField {...props} />;
    case 'radio':       return <RadioField {...props} />;
    case 'toggle':      return <ToggleField {...props} />;
    case 'date':        return <DateField {...props} />;
    case 'time':        return <TimeField {...props} />;
    case 'image':       return <ImageField {...props} />;
    case 'gps':         return <GPSField {...props} />;
    case 'signature':   return <TextareaField {...props} />;
    default:            return <TextField {...props} />;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fieldWrap: {
    marginBottom: Spacing.base,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  required: {
    color: Colors.error,
  },
  errorText: {
    fontSize: Typography.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  textarea: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },

  // Dropdown
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  dropdownPlaceholder: {
    fontSize: Typography.base,
    color: Colors.textMuted,
    flex: 1,
  },
  dropdownChevron: {
    fontSize: 16,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  modalDone: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.base,
  },
  modalDoneText: {
    color: Colors.textInverse,
    fontWeight: Typography.bold,
    fontSize: Typography.base,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  optionRowActive: {
    backgroundColor: Colors.primaryMuted,
  },
  optionText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  optionTextActive: {
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  optionCheck: {
    color: Colors.primary,
    fontWeight: Typography.bold,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxTick: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: Typography.bold,
  },
  checkboxLabel: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    flex: 1,
  },

  // Radio
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  radioOuterActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Image
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  imageTile: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: 80,
    height: 80,
  },
  imageRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.overlay,
    borderRadius: Radius.full,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRemoveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: Typography.bold,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  imageBtn: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.inputBg,
  },
  imageBtnIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  imageBtnLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },

  // GPS
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.md,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  gpsButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  gpsIcon: {
    fontSize: 18,
  },
  gpsText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  gpsRemove: {
    color: Colors.textMuted,
    fontSize: 14,
    paddingHorizontal: Spacing.xs,
  },
});
