import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import StateView from '@/components/StateView';
import { AttendanceBadge, EventPhaseBadge } from '@/components/StatusBadge';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  deleteAttendance,
  EMPTY_SUMMARY,
  getEventAttendees,
  getMyAttendanceForEvent,
  summarize,
  updateAttendanceStatus,
  type AttendanceStatus,
  type EventAttendee,
} from '@/lib/attendance';
import { getEvent, getEventPhase, setEventStatus, type EventRecord } from '@/lib/events';
import { formatDate, formatDateTime, formatTime } from '@/lib/format';
import { buildQRPayload } from '@/lib/qr';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, role } = useAuth();

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [myRecord, setMyRecord] = useState<{ scannedAt: string; status: AttendanceStatus } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isOwner = !!event && event.created_by === user?.id;
  const canManage = role === 'admin' || (role === 'teacher' && isOwner);

  const load = useCallback(async () => {
    if (!id || !user) return;
    setError(null);
    const ev = await getEvent(id);
    if (!ev) {
      setError('This event could not be found.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setEvent(ev);

    const manager = role === 'admin' || (role === 'teacher' && ev.created_by === user.id);
    if (manager) {
      const res = await getEventAttendees(ev.id);
      if (res.error) setError(res.error);
      setAttendees(res.attendees);
    } else if (role === 'student') {
      setMyRecord(await getMyAttendanceForEvent(user.id, ev.id));
    }
    setLoading(false);
    setRefreshing(false);
  }, [id, user, role]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // EVENT: "Close / Reopen event" pressed -> status changes in the database.
  const changeStatus = (next: 'open' | 'closed') => {
    if (!event) return;
    Alert.alert(
      next === 'closed' ? 'Close this event?' : 'Reopen this event?',
      next === 'closed'
        ? 'Students will no longer be able to record attendance with its QR code.'
        : 'Students will be able to scan the QR code again during the event time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next === 'closed' ? 'Close Event' : 'Reopen',
          style: next === 'closed' ? 'destructive' : 'default',
          onPress: async () => {
            setBusy(true);
            const { error: err } = await setEventStatus(event.id, next);
            setBusy(false);
            if (err) Alert.alert('Error', err);
            else load();
          },
        },
      ]
    );
  };

  // Admin only: correct an attendance record.
  const correctRecord = (a: EventAttendee) => {
    const apply = async (status: AttendanceStatus) => {
      const { error: err } = await updateAttendanceStatus(a.id, status);
      if (err) Alert.alert('Error', err);
      else load();
    };
    Alert.alert(a.name ?? 'Student', 'Correct this attendance record', [
      { text: 'Mark Present', onPress: () => apply('present') },
      { text: 'Mark Excused', onPress: () => apply('excused') },
      { text: 'Mark Absent', onPress: () => apply('absent') },
      {
        text: 'Remove Record',
        style: 'destructive',
        onPress: async () => {
          const { error: err } = await deleteAttendance(a.id);
          if (err) Alert.alert('Error', err);
          else load();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (loading) return <StateView kind='loading' message='Loading event...' />;
  if (error && !event) {
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
  if (!event) return null;

  const phase = getEventPhase(event);
  const summary = canManage ? summarize(attendees) : EMPTY_SUMMARY;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{event.title}</Text>
        </View>
        <EventPhaseBadge phase={phase} />
        <Text style={styles.meta}>📅 {formatDate(event.start_time)}</Text>
        <Text style={styles.meta}>
          🕒 {formatTime(event.start_time)} - {formatTime(event.end_time)}
        </Text>
        {event.venue ? <Text style={styles.meta}>📍 {event.venue}</Text> : null}
        {event.description ? <Text style={styles.description}>{event.description}</Text> : null}
        {canManage ? <Text style={styles.code}>Event code: {event.event_code}</Text> : null}
      </View>

      {role === 'student' && (
        <View style={[styles.card, myRecord ? styles.okCard : null]}>
          <Text style={styles.sectionTitle}>Your attendance</Text>
          {myRecord ? (
            <>
              <AttendanceBadge status={myRecord.status} />
              <Text style={styles.meta}>Recorded {formatDateTime(myRecord.scannedAt)}</Text>
            </>
          ) : (
            <Text style={styles.meta}>
              {phase === 'ongoing'
                ? 'Not recorded yet. Open the Scan tab and scan the event QR code.'
                : phase === 'upcoming'
                ? 'This event has not started yet.'
                : 'No attendance was recorded for you.'}
            </Text>
          )}
        </View>
      )}

      {canManage && (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Event QR Code</Text>
            {phase === 'closed' ? (
              <Text style={styles.closedNote}>
                This event is closed. Its QR code is no longer accepted.
              </Text>
            ) : (
              <View style={styles.qrBox}>
                <QRCode value={buildQRPayload(event.event_code)} size={220} />
                <Text style={styles.hint}>
                  Show this code to students. It is only accepted during the event time.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <AppButton
              title='Edit Event'
              icon='create-outline'
              disabled={busy}
              onPress={() => router.push(`/event/form?id=${event.id}`)}
            />
            {event.status === 'open' ? (
              <AppButton
                theme='danger'
                title='Close Event'
                icon='lock-closed-outline'
                loading={busy}
                onPress={() => changeStatus('closed')}
              />
            ) : (
              <AppButton
                title='Reopen Event'
                icon='lock-open-outline'
                loading={busy}
                onPress={() => changeStatus('open')}
              />
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Attendance summary</Text>
            <View style={styles.statRow}>
              <Stat label='Total' value={summary.total} color={COLORS.textPrimary} />
              <Stat label='Present' value={summary.present} color={COLORS.success} />
              <Stat label='Excused' value={summary.excused} color={COLORS.warning} />
              <Stat label='Absent' value={summary.absent} color={COLORS.danger} />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Attendance records</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {attendees.length === 0 ? (
              <Text style={styles.meta}>No students have recorded attendance yet.</Text>
            ) : (
              attendees.map((a) => (
                <Pressable
                  key={a.id}
                  style={styles.attendeeRow}
                  disabled={role !== 'admin'}
                  onPress={() => correctRecord(a)}
                >
                  <View style={styles.flex}>
                    <Text style={styles.attendeeName}>{a.name ?? 'Unnamed student'}</Text>
                    <Text style={styles.metaSmall}>
                      {a.idNumber ? `${a.idNumber} · ` : ''}
                      {formatDateTime(a.scannedAt)}
                    </Text>
                  </View>
                  <AttendanceBadge status={a.status} />
                </Pressable>
              ))
            )}
            {role === 'admin' && attendees.length > 0 ? (
              <Text style={styles.hint}>Tap a record to correct or remove it.</Text>
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  okCard: { borderColor: COLORS.success },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  meta: { fontSize: 14, color: COLORS.textSecondary },
  metaSmall: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  description: { fontSize: 14, color: COLORS.textPrimary, marginTop: 6, lineHeight: 20 },
  code: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  qrBox: { alignItems: 'center', paddingVertical: 12, gap: 12 },
  hint: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  closedNote: { fontSize: 14, color: COLORS.danger },
  actions: { marginBottom: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attendeeName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  errorText: { color: COLORS.danger, fontSize: 13 },
});
