import { supabase } from './supabase';
import { parseQRPayload } from './qr';

export type AttendanceStatus = 'present' | 'excused' | 'absent';

export type ScanErrorCode =
  | 'INVALID_QR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'EVENT_CLOSED'
  | 'NOT_STARTED'
  | 'EVENT_ENDED'
  | 'DUPLICATE'
  | 'ERROR';

export type RecordResult =
  | { ok: true; eventTitle: string; scannedAt: string }
  | { ok: false; code: ScanErrorCode; message: string; eventTitle?: string };

// EVENT: "QR scanner detected a code" -> this is the handler's main action.
// All the rules (event exists, open, on time, student only, no duplicates)
// run inside the database function record_attendance() so they cannot be
// bypassed by a modified app.
export async function recordAttendance(rawPayload: string): Promise<RecordResult> {
  const parsed = parseQRPayload(rawPayload);
  if (!parsed.ok) {
    return { ok: false, code: 'INVALID_QR', message: parsed.message };
  }

  const { data, error } = await supabase.rpc('record_attendance', {
    p_event_code: parsed.payload.event,
  });

  if (error || !data) {
    return {
      ok: false,
      code: 'ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
    };
  }

  const res = data as {
    ok: boolean;
    code?: ScanErrorCode;
    message?: string;
    eventTitle?: string;
    scannedAt?: string;
  };

  if (res.ok) {
    return {
      ok: true,
      eventTitle: res.eventTitle ?? 'Event',
      scannedAt: res.scannedAt ?? new Date().toISOString(),
    };
  }

  return {
    ok: false,
    code: res.code ?? 'ERROR',
    message: res.message ?? 'Attendance could not be recorded.',
    eventTitle: res.eventTitle,
  };
}

// ----- Student: own history -----

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventCode: string;
  eventTitle: string;
  venue: string | null;
  scannedAt: string;
  status: AttendanceStatus;
};

export async function getMyAttendanceHistory(
  studentId: string
): Promise<{ records: AttendanceRecord[]; error: string | null }> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, event_id, scanned_at, status, events ( event_code, title, venue )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    return { records: [], error: error?.message ?? 'Could not load history.' };
  }

  return {
    error: null,
    records: (data as any[]).map((row) => ({
      id: row.id,
      eventId: row.event_id,
      eventCode: row.events?.event_code ?? '',
      eventTitle: row.events?.title ?? 'Unknown event',
      venue: row.events?.venue ?? null,
      scannedAt: row.scanned_at,
      status: row.status as AttendanceStatus,
    })),
  };
}

export async function getMyAttendanceForEvent(
  studentId: string,
  eventId: string
): Promise<{ scannedAt: string; status: AttendanceStatus } | null> {
  const { data } = await supabase
    .from('attendance')
    .select('scanned_at, status')
    .eq('student_id', studentId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (!data) return null;
  return { scannedAt: data.scanned_at, status: data.status as AttendanceStatus };
}

// ----- Teacher / Admin: records and summaries -----

export type EventAttendee = {
  id: string; // attendance row id
  studentId: string;
  name: string | null;
  email: string | null;
  idNumber: string | null;
  scannedAt: string;
  status: AttendanceStatus;
};

export async function getEventAttendees(
  eventId: string
): Promise<{ attendees: EventAttendee[]; error: string | null }> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, student_id, scanned_at, status')
    .eq('event_id', eventId)
    .order('scanned_at', { ascending: true });

  if (error || !data) {
    return { attendees: [], error: error?.message ?? 'Could not load attendance.' };
  }

  const rows = data as any[];
  const ids = [...new Set(rows.map((r) => r.student_id as string))];
  const profileMap: Record<
    string,
    { full_name: string | null; email: string | null; id_number: string | null }
  > = {};

  if (ids.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email, id_number')
      .in('id', ids);
    ((profs as any[] | null) ?? []).forEach((p) => {
      profileMap[p.id] = p;
    });
  }

  return {
    error: null,
    attendees: rows.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      name: profileMap[r.student_id]?.full_name ?? null,
      email: profileMap[r.student_id]?.email ?? null,
      idNumber: profileMap[r.student_id]?.id_number ?? null,
      scannedAt: r.scanned_at,
      status: r.status as AttendanceStatus,
    })),
  };
}

export type AttendanceSummary = {
  total: number;
  present: number;
  excused: number;
  absent: number;
};

export const EMPTY_SUMMARY: AttendanceSummary = {
  total: 0,
  present: 0,
  excused: 0,
  absent: 0,
};

export function summarize(
  rows: { status: AttendanceStatus }[]
): AttendanceSummary {
  const s = { ...EMPTY_SUMMARY };
  rows.forEach((r) => {
    s.total += 1;
    s[r.status] += 1;
  });
  return s;
}

// Counts per event (RLS limits this to the teacher's own events, or all for admin).
export async function getSummariesByEvent(
  eventIds: string[]
): Promise<Record<string, AttendanceSummary>> {
  const result: Record<string, AttendanceSummary> = {};
  if (eventIds.length === 0) return result;

  const { data, error } = await supabase
    .from('attendance')
    .select('event_id, status')
    .in('event_id', eventIds);

  if (error || !data) return result;

  (data as any[]).forEach((row) => {
    const s = (result[row.event_id] ??= { ...EMPTY_SUMMARY });
    s.total += 1;
    s[row.status as AttendanceStatus] += 1;
  });
  return result;
}

// ----- Admin only: correct attendance records -----

export async function updateAttendanceStatus(
  attendanceId: string,
  status: AttendanceStatus
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('attendance')
    .update({ status })
    .eq('id', attendanceId)
    .select('id')
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: 'Only an administrator can correct attendance.' };
  return { error: null };
}

export async function deleteAttendance(
  attendanceId: string
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', attendanceId)
    .select('id')
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: 'Only an administrator can remove attendance.' };
  return { error: null };
}
