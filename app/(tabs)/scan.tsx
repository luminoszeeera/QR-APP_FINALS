import { CameraView, useCameraPermissions } from "expo-camera";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";

import AppButton from "@/components/AppButton";
import StateView from "@/components/StateView";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { recordAttendance, type RecordResult, type ScanErrorCode } from "@/lib/attendance";
import { formatDateTime } from "@/lib/format";

type IconName = keyof typeof Ionicons.glyphMap;

// Feedback shown for every possible scan outcome.
const ERROR_UI: Record<ScanErrorCode, { icon: IconName; title: string; color: string }> = {
  INVALID_QR: { icon: "close-circle", title: "Invalid QR Code", color: COLORS.danger },
  DUPLICATE: { icon: "copy", title: "Already Recorded", color: COLORS.warning },
  EVENT_CLOSED: { icon: "lock-closed", title: "Event Closed", color: COLORS.danger },
  NOT_STARTED: { icon: "time", title: "Event Not Started", color: COLORS.warning },
  EVENT_ENDED: { icon: "time", title: "Event Has Ended", color: COLORS.warning },
  FORBIDDEN: { icon: "ban", title: "Not Allowed", color: COLORS.danger },
  UNAUTHENTICATED: { icon: "ban", title: "Please Sign In", color: COLORS.danger },
  ERROR: { icon: "cloud-offline", title: "Connection Problem", color: COLORS.danger },
};

export default function ScanScreen() {
  const { role } = useAuth();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<RecordResult | null>(null);
  // A ref (not state) so a second scan in the same frame is blocked immediately.
  const busy = useRef(false);

  // Start fresh every time the tab is opened.
  useFocusEffect(
    useCallback(() => {
      busy.current = false;
      setResult(null);
      setProcessing(false);
    }, [])
  );

  if (role !== "student") {
    return (
      <StateView
        kind="unauthorized"
        message="Only student accounts can scan attendance QR codes."
      />
    );
  }

  if (!permission) return <StateView kind="loading" message="Checking camera..." />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.title}>Camera Permission Needed</Text>
        <Text style={styles.subtitle}>We need access to your camera to scan QR codes.</Text>
        <AppButton
          theme="primary"
          title="Grant Permission"
          icon="camera"
          onPress={requestPermission}
        />
      </View>
    );
  }

  // EVENT: the camera detected a QR code.
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (busy.current) return;
    busy.current = true;
    setProcessing(true);
    const res = await recordAttendance(data);
    setResult(res);
    setProcessing(false);
  };

  const handleScanAgain = () => {
    busy.current = false;
    setResult(null);
  };

  const ui = result && !result.ok ? ERROR_UI[result.code] : null;

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={result || processing ? undefined : handleBarcodeScanned}
        />
      )}

      <View style={styles.overlay}>
        {processing ? (
          <>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.overlayText}>Recording attendance...</Text>
          </>
        ) : result?.ok ? (
          <>
            <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
            <Text style={[styles.resultTitle, { color: COLORS.success }]}>
              Attendance Recorded
            </Text>
            <Text style={styles.eventName}>{result.eventTitle}</Text>
            <Text style={styles.subtitle}>{formatDateTime(result.scannedAt)}</Text>
          </>
        ) : result && ui ? (
          <>
            <Ionicons name={ui.icon} size={56} color={ui.color} />
            <Text style={[styles.resultTitle, { color: ui.color }]}>{ui.title}</Text>
            {result.eventTitle ? (
              <Text style={styles.eventName}>{result.eventTitle}</Text>
            ) : null}
            <Text style={styles.subtitle}>{result.message}</Text>
          </>
        ) : (
          <Text style={styles.overlayText}>Point your camera at the event QR code</Text>
        )}

        {result && !processing ? (
          <View style={styles.buttonWrap}>
            <AppButton
              theme="primary"
              title="Scan Again"
              icon="refresh"
              onPress={handleScanAgain}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  camera: { ...StyleSheet.absoluteFillObject },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  overlay: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 40,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  overlayText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginTop: 4,
  },
  resultTitle: { fontSize: 20, fontWeight: "800", marginTop: 6, textAlign: "center" },
  eventName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginVertical: 4,
    textAlign: "center",
  },
  buttonWrap: { width: "100%", marginTop: 12 },
});
