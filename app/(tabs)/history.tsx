import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import StateView from '@/components/StateView';
import { AttendanceBadge, EventPhaseBadge } from '@/components/StatusBadge';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  EMPTY_SUMMARY,
  getMyAttendanceHistory,
  getSummariesByEvent,
  type AttendanceRecord,
  type AttendanceSummary,
} from '@/lib/attendance';
import { getEventPhase, listEvents, type EventRecord } from '@/lib/events';
import { formatDate, formatDateTime } from '@/lib/format';

export default function HistoryScreen() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [records, setRecords] = useState<AttendanceRecord[]>([]); // student
  const [events, setEvents] = useState<EventRecord[]>([]); // teacher / admin
  const [summaries, setSummaries] = useState<Record<string, AttendanceSummary>>({});

  const load = useCallback(async () => {
    if (!user || !role) return;
    setError(null);

    if (role === 'student') {
      const res = await getMyAttendanceHistory(user.id);
      if (res.error) setError(res.error);
      setRecords(res.records);
    } else {
      const res = await listEvents({ mineOnly: role === 'teacher' ? user.id : undefined });
      if (res.error) {
        setError(res.error);
      } else {
        setEvents(res.events);
        setSummaries(await getSummariesByEvent(res.events.map((e) => e.id)));
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, [user, role]);

  // EVENT: tab focused -> data is refreshed.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
    />
  );

  if (loading) return <StateView kind='loading' message='Loading records...' />;
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

  // ----- Student: personal attendance history -----
  if (role === 'student') {
    return (
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={records}
        keyExtractor={(item) => item.id}
        refreshControl={refreshControl}
        ListEmptyComponent={
          <StateView
            kind='empty'
            title='No records yet'
            message='Scan an event QR code to record your attendance.'
          />
        }
        ListHeaderComponent={
          records.length > 0 ? (
            <Text style={styles.header}>
              {records.length} event{records.length === 1 ? '' : 's'} attended
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/event/${item.eventId}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.eventTitle}</Text>
              <AttendanceBadge status={item.status} />
            </View>
            {item.venue ? <Text style={styles.meta}>📍 {item.venue}</Text> : null}
            <Text style={styles.meta}>🕒 {formatDateTime(item.scannedAt)}</Text>
          </Pressable>
        )}
      />
    );
  }

  // ----- Teacher / Admin: attendance summaries per event -----
  const totals = Object.values(summaries).reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      present: acc.present + s.present,
      excused: acc.excused + s.excused,
      absent: acc.absent + s.absent,
    }),
    { ...EMPTY_SUMMARY }
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={events}
      keyExtractor={(item) => item.id}
      refreshControl={refreshControl}
      ListEmptyComponent={
        <StateView
          kind='empty'
          title='No events yet'
          message={
            role === 'teacher'
              ? 'Create an event to start collecting attendance.'
              : 'No events have been created yet.'
          }
        />
      }
      ListHeaderComponent={
        events.length > 0 ? (
          <View style={styles.totalsCard}>
            <Text style={styles.totalsTitle}>
              {role === 'admin' ? 'Overall attendance' : 'My events attendance'}
            </Text>
            <View style={styles.totalsRow}>
              <Total label='Events' value={events.length} color={COLORS.textPrimary} />
              <Total label='Records' value={totals.total} color={COLORS.accent} />
              <Total label='Present' value={totals.present} color={COLORS.success} />
              <Total label='Excused' value={totals.excused} color={COLORS.warning} />
              <Total label='Absent' value={totals.absent} color={COLORS.danger} />
            </View>
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        const s = summaries[item.id] ?? EMPTY_SUMMARY;
        return (
          <Pressable style={styles.card} onPress={() => router.push(`/event/${item.id}`)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <EventPhaseBadge phase={getEventPhase(item)} />
            </View>
            <Text style={styles.meta}>{formatDate(item.start_time)}</Text>
            <Text style={styles.summaryLine}>
              {s.total} total · {s.present} present · {s.excused} excused · {s.absent} absent
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

function Total({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.total}>
      <Text style={[styles.totalValue, { color }]}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  header: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12 },
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
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 13, color: COLORS.textSecondary },
  summaryLine: { fontSize: 13, fontWeight: '600', color: COLORS.accent, marginTop: 4 },
  totalsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorderNeon,
  },
  totalsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { alignItems: 'center', flex: 1 },
  totalValue: { fontSize: 20, fontWeight: '800' },
  totalLabel: { fontSize: 11, color: COLORS.textSecondary },
});
