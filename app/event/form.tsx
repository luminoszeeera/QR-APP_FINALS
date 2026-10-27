import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import AppButton from '@/components/AppButton';
import StateView from '@/components/StateView';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { createEvent, getEvent, updateEvent } from '@/lib/events';
import { formatDateTime } from '@/lib/format';
import { validateEventForm } from '@/lib/validation';

// One form for both "Create event" and "Edit event" (when ?id=... is given).
export default function EventFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, role } = useAuth();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [editTarget, setEditTarget] = useState<'start' | 'end' | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(true);

  const canManage = role === 'teacher' || role === 'admin';

  useEffect(() => {
    if (!id) return;
    let active = true;
    getEvent(id).then((ev) => {
      if (!active) return;
      if (!ev) {
        setMessage('Event not found.');
      } else if (role !== 'admin' && ev.created_by !== user?.id) {
        setAllowed(false);
      } else {
        setTitle(ev.title);
        setVenue(ev.venue ?? '');
        setDescription(ev.description ?? '');
        if (ev.start_time) setStartDate(new Date(ev.start_time));
        if (ev.end_time) setEndDate(new Date(ev.end_time));
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id, role, user?.id]);

  if (!canManage || !allowed) {
    return (
      <StateView
        kind='unauthorized'
        message='Only the teacher who created this event (or an administrator) can do this.'
      />
    );
  }
  if (loading) return <StateView kind='loading' message='Loading event...' />;

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }
    if (selected) {
      if (editTarget === 'start') {
        setStartDate(selected);
        // keep the end after the start when the start moves later
        if (selected >= endDate) setEndDate(new Date(selected.getTime() + 60 * 60 * 1000));
      }
      if (editTarget === 'end') setEndDate(selected);
    }
    if (Platform.OS === 'android' && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const applyQuickDuration = (minutes: number) => {
    setEndDate(new Date(startDate.getTime() + minutes * 60 * 1000));
  };

  // EVENT: "Save" pressed -> validate -> insert/update -> navigate.
  const handleSave = async () => {
    setMessage(null);
    const problem = validateEventForm(
      { title, venue, description, start: startDate, end: endDate },
      { requireFuture: !isEdit }
    );
    if (problem) {
      setMessage(problem);
      return;
    }

    setSaving(true);
    const input = { title, venue, description, start: startDate, end: endDate };
    const res = isEdit && id ? await updateEvent(id, input) : await createEvent(input);
    setSaving(false);

    if (res.error || !res.event) {
      setMessage(res.error ?? 'Could not save the event. Please try again.');
      return;
    }

    if (isEdit) {
      router.back();
    } else {
      // Go straight to the event page, where the QR code is shown.
      router.replace(`/event/${res.event.id}`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps='handled'
      >
        <Text style={styles.heading}>{isEdit ? 'Edit Event' : 'Create Event'}</Text>

        <Text style={styles.label}>Event Name *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder='Founders Day Assembly'
          placeholderTextColor={COLORS.muted}
          maxLength={100}
          editable={!saving}
        />

        <Text style={styles.label}>Venue *</Text>
        <TextInput
          style={styles.input}
          value={venue}
          onChangeText={setVenue}
          placeholder='Main Gymnasium'
          placeholderTextColor={COLORS.muted}
          maxLength={100}
          editable={!saving}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder='What is this event about?'
          placeholderTextColor={COLORS.muted}
          multiline
          maxLength={500}
          editable={!saving}
        />

        <Text style={styles.label}>Start (date & time) *</Text>
        <Pressable
          style={styles.input}
          onPress={() => {
            setEditTarget('start');
            setEditingPart('date');
          }}
        >
          <Text style={styles.inputText}>{formatDateTime(startDate.toISOString())}</Text>
        </Pressable>

        <Text style={styles.label}>End (date & time) *</Text>
        <Pressable
          style={styles.input}
          onPress={() => {
            setEditTarget('end');
            setEditingPart('date');
          }}
        >
          <Text style={styles.inputText}>{formatDateTime(endDate.toISOString())}</Text>
        </Pressable>

        {editTarget && (
          <DateTimePicker
            value={editTarget === 'start' ? startDate : endDate}
            mode={Platform.OS === 'android' ? editingPart : 'datetime'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPickerChange}
          />
        )}

        <View style={styles.chipRow}>
          {[30, 60, 120].map((m) => (
            <Pressable key={m} style={styles.chip} onPress={() => applyQuickDuration(m)}>
              <Text style={styles.chipText}>{m === 30 ? '+30 min' : `+${m / 60} hr`}</Text>
            </Pressable>
          ))}
        </View>

        {message ? <Text style={styles.error}>{message}</Text> : null}

        <View style={styles.actions}>
          <AppButton
            theme='primary'
            title={isEdit ? 'Save Changes' : 'Create Event & QR'}
            icon={isEdit ? 'save-outline' : 'qr-code-outline'}
            loading={saving}
            onPress={handleSave}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  inputText: { fontSize: 16, color: COLORS.textPrimary },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { color: COLORS.shadow, fontWeight: '600', fontSize: 13 },
  error: { color: COLORS.danger, fontSize: 14, marginTop: 14 },
  actions: { marginTop: 24 },
});
