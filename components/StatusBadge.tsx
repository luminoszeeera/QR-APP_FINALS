import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/colors";
import type { AttendanceStatus } from "@/lib/attendance";
import { PHASE_LABEL, type EventPhase } from "@/lib/events";

type Tone = "success" | "danger" | "warning" | "info" | "neutral";

const TONE_COLOR: Record<Tone, string> = {
  success: COLORS.success,
  danger: COLORS.danger,
  warning: COLORS.warning,
  info: COLORS.info,
  neutral: COLORS.textSecondary,
};

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  const color = TONE_COLOR[tone];
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: color + "18" }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const PHASE_TONE: Record<EventPhase, Tone> = {
  upcoming: "info",
  ongoing: "success",
  ended: "neutral",
  closed: "danger",
};

export function EventPhaseBadge({ phase }: { phase: EventPhase }) {
  return <Badge label={PHASE_LABEL[phase]} tone={PHASE_TONE[phase]} />;
}

const ATT_TONE: Record<AttendanceStatus, Tone> = {
  present: "success",
  excused: "warning",
  absent: "danger",
};

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge label={label} tone={ATT_TONE[status]} />;
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12, fontWeight: "700" },
});
