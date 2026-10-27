import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/colors";
import AppButton from "@/components/AppButton";

// One component for the screen states the project requires:
// loading, empty data, error and unauthorized access.
type Props =
  | { kind: "loading"; message?: string }
  | { kind: "empty"; title: string; message?: string }
  | { kind: "error"; message: string; onRetry?: () => void }
  | { kind: "unauthorized"; message?: string };

export default function StateView(props: Props) {
  if (props.kind === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.message}>{props.message ?? "Loading..."}</Text>
      </View>
    );
  }

  if (props.kind === "empty") {
    return (
      <View style={styles.centered}>
        <Ionicons name="file-tray-outline" size={48} color={COLORS.muted} />
        <Text style={styles.title}>{props.title}</Text>
        {props.message ? <Text style={styles.message}>{props.message}</Text> : null}
      </View>
    );
  }

  if (props.kind === "error") {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>{props.message}</Text>
        {props.onRetry ? (
          <View style={styles.retry}>
            <AppButton title="Try Again" icon="refresh" onPress={props.onRetry} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.message}>
        {props.message ?? "You do not have permission to view this page."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  retry: { marginTop: 16, width: "70%" },
});
