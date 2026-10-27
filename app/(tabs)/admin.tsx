import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import StateView from '@/components/StateView';
import { Badge } from '@/components/StatusBadge';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { listProfiles, setUserRole, type Profile, type Role } from '@/lib/profiles';

const ROLE_TONE = { student: 'neutral', teacher: 'info', admin: 'danger' } as const;
const ROLE_LABEL: Record<Role, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin',
};

// Administrator only: user management (view users, change roles).
export default function AdminUsersScreen() {
  const { user, role } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setError(null);
    const res = await listProfiles();
    if (res.error) setError(res.error);
    setProfiles(res.profiles);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (role === 'admin') load();
    }, [load, role])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        (p.full_name ?? '').toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.id_number ?? '').toLowerCase().includes(q)
    );
  }, [profiles, query]);

  if (role !== 'admin') {
    return <StateView kind='unauthorized' message='Only administrators can manage users.' />;
  }
  if (loading) return <StateView kind='loading' message='Loading users...' />;
  if (error) {
    return (
      <StateView
        kind='error'
        message={error}
        onRetry={() => {
          setLoading(true);
          load();
        }}
      />
    );
  }

  const changeRole = (p: Profile) => {
    if (p.id === user?.id) {
      Alert.alert('Not allowed', 'You cannot change your own role.');
      return;
    }
    const apply = (next: Role) => {
      if (next === p.role) return;
      Alert.alert(
        'Change role?',
        `${p.full_name ?? p.email} will become a ${ROLE_LABEL[next]}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              const { error: err } = await setUserRole(p.id, next);
              if (err) Alert.alert('Error', err);
              else load();
            },
          },
        ]
      );
    };
    Alert.alert(p.full_name ?? p.email, 'Choose a new role', [
      { text: 'Student', onPress: () => apply('student') },
      { text: 'Teacher', onPress: () => apply('teacher') },
      { text: 'Administrator', onPress: () => apply('admin') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder='Search name, email or ID number'
        placeholderTextColor={COLORS.muted}
        autoCapitalize='none'
        autoCorrect={false}
      />
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={<StateView kind='empty' title='No users found' />}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => changeRole(item)}>
            <View style={styles.flex}>
              <Text style={styles.name}>{item.full_name ?? 'Unnamed user'}</Text>
              <Text style={styles.meta}>{item.email}</Text>
              {item.id_number ? <Text style={styles.meta}>ID: {item.id_number}</Text> : null}
            </View>
            <Badge label={ROLE_LABEL[item.role]} tone={ROLE_TONE[item.role]} />
          </Pressable>
        )}
      />
      <Text style={styles.footer}>Tap a user to change their role.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  search: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  listContent: { padding: 16, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  footer: { textAlign: 'center', fontSize: 12, color: COLORS.muted, paddingBottom: 12 },
});
