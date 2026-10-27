import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import AppButton from '@/components/AppButton';
import { Badge } from '@/components/StatusBadge';
import { COLORS } from '@/constants/colors';
import { refreshProfile, signOut, useAuth } from '@/lib/auth';
import { updateProfile } from '@/lib/profiles';
import { validateFullName, validateIdNumber } from '@/lib/validation';

const ROLE_LABEL = { student: 'Student', teacher: 'Teacher', admin: 'Administrator' } as const;

export default function ProfileScreen() {
  const { user, profile } = useAuth();
  const [draftName, setDraftName] = useState('');
  const [draftId, setDraftId] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [])
  );

  const startEditing = () => {
    setDraftName(profile?.full_name ?? '');
    setDraftId(profile?.id_number ?? '');
    setFormError(null);
    setEditing(true);
  };

  // EVENT: "Save" pressed -> validate -> update profile -> refresh.
  const handleSave = async () => {
    if (!user) return;
    const problem = validateFullName(draftName) ?? validateIdNumber(draftId);
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    const { error } = await updateProfile(user.id, {
      full_name: draftName.trim(),
      id_number: draftId.trim() || null,
    });
    setSaving(false);
    if (error) {
      setFormError(error);
      return;
    }
    await refreshProfile();
    setEditing(false);
  };

  // EVENT: "Sign Out" pressed -> session cleared -> route guard sends user to login.
  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          const { error } = await signOut();
          setSigningOut(false);
          if (error) Alert.alert('Signed out locally', error);
        },
      },
    ]);
  };

  const role = profile?.role ?? 'student';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps='handled'
    >
      <Text style={styles.title}>My Profile</Text>
      <View style={styles.badgeRow}>
        <Badge
          label={ROLE_LABEL[role]}
          tone={role === 'admin' ? 'danger' : role === 'teacher' ? 'info' : 'neutral'}
        />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.label}>Name</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={draftName}
            onChangeText={setDraftName}
            placeholder='Your full name'
            placeholderTextColor={COLORS.muted}
            maxLength={80}
            editable={!saving}
          />
        ) : (
          <Text style={styles.value}>{profile?.full_name || 'Not set'}</Text>
        )}

        <Text style={styles.label}>
          {role === 'student' ? 'Student ID number' : 'ID number'}
        </Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={draftId}
            onChangeText={setDraftId}
            placeholder='e.g. 2026-00123'
            placeholderTextColor={COLORS.muted}
            autoCapitalize='characters'
            maxLength={30}
            editable={!saving}
          />
        ) : (
          <Text style={styles.value}>{profile?.id_number || 'Not set'}</Text>
        )}

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? profile?.email}</Text>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        {editing ? (
          <View style={styles.editActions}>
            <Pressable
              style={[styles.smallButton, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.textOnPrimary} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.smallButton, styles.cancelButton]}
              onPress={() => setEditing(false)}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={startEditing} style={styles.editLink}>
            <Text style={styles.editHint}>Edit profile</Text>
          </Pressable>
        )}
      </View>

      <AppButton
        title='Sign Out'
        icon='log-out-outline'
        loading={signingOut}
        onPress={handleSignOut}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', marginBottom: 16 },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: { fontSize: 16, color: COLORS.textPrimary },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 12 },
  editLink: { marginTop: 16, alignSelf: 'flex-start' },
  editHint: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  smallButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: { backgroundColor: COLORS.primary },
  saveText: { color: COLORS.textOnPrimary, fontWeight: '700' },
  cancelButton: { backgroundColor: COLORS.surface },
  cancelText: { color: COLORS.shadow, fontWeight: '700' },
});
