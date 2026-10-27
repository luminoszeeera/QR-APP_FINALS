import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import StateView from '@/components/StateView';
import { EventPhaseBadge } from '@/components/StatusBadge';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getSummariesByEvent, type AttendanceSummary } from '@/lib/attendance';
import { getEventPhase, listEvents, type EventRecord } from '@/lib/events';
import { formatDate, formatTime } from '@/lib/format';

export default function EventsScreen() {
  const { user, role } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [summaries, setSummaries] = useState<Record<string, AttendanceSummary>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = role === 'teacher' || role === 'admin';

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    // Teachers only manage their own events; students and admins see all.
    const res = await listEvents({
      mineOnly: role === 'teacher' ? user.id : undefined,
    });
    if (res.error) {
      setError(res.error);
      setEvents([]);
    } else {
      setEvents(res.events);
      if (canManage) setSummaries(await getSummariesByEvent(res.events.map((e) => e.id)));
    }
    setLoading(false);
    setRefreshing(false);
  }, [user, role, canManage]);

  // EVENT: screen gets focus -> reload the data.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <StateView kind='loading' message='Loading events...' />;
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

  return (
    <View style={styles.container}>
      {canManage && (
        <Pressable
          style={styles.newButton}
          onPress={() => router.push('/event/form')}
          accessibilityRole='button'
          accessibilityLabel='Create a new event'
        >
          <Ionicons name='add-circle' size={22} color={COLORS.textOnPrimary} />
          <Text style={styles.newButtonText}>New Event</Text>
        </Pressable>
      )}

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
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
        ListEmptyComponent={
          <StateView
            kind='empty'
            title='No events yet'
            message={
              canManage
                ? 'Tap "New Event" to create your first event.'
                : 'Events created by your teachers will show up here.'
            }
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/event/${item.id}`)}
            accessibilityRole='button'
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <EventPhaseBadge phase={getEventPhase(item)} />
            </View>
            <Text style={styles.meta}>
              {formatDate(item.start_time)} · {formatTime(item.start_time)} -{' '}
              {formatTime(item.end_time)}
            </Text>
            {item.venue ? <Text style={styles.meta}>📍 {item.venue}</Text> : null}
            {canManage ? (
              <Text style={styles.count}>
                {summaries[item.id]?.total ?? 0} attendee
                {(summaries[item.id]?.total ?? 0) === 1 ? '' : 's'}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    margin: 16,
    marginBottom: 0,
    paddingVertical: 14,
    borderRadius: 14,
  },
  newButtonText: { color: COLORS.textOnPrimary, fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 13, color: COLORS.textSecondary },
  count: { fontSize: 13, fontWeight: '600', color: COLORS.accent, marginTop: 4 },
});
