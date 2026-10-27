import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/colors";

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme?: "primary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

export default function AppButton({
  title,
  icon,
  theme,
  disabled,
  loading,
  onPress,
}: Props) {
  const isBlocked = !!disabled || !!loading;
  const filledColor =
    theme === "danger" ? COLORS.danger : theme === "primary" ? COLORS.primary : null;

  if (filledColor) {
    return (
      <View
        style={[
          styles.buttonOuter,
          { borderWidth: 3, borderColor: filledColor, borderRadius: 18 },
          isBlocked && styles.blocked,
        ]}
      >
        <Pressable
          style={[styles.buttonInner, { backgroundColor: filledColor }]}
          onPress={onPress}
          disabled={isBlocked}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textOnPrimary} style={styles.icon} />
          ) : (
            <Ionicons
              name={icon}
              size={22}
              color={COLORS.textOnPrimary}
              style={styles.icon}
            />
          )}
          <Text style={[styles.label, { color: COLORS.textOnPrimary }]}>
            {title}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.buttonOuter, isBlocked && styles.blocked]}>
      <Pressable
        style={styles.buttonInner}
        onPress={onPress}
        disabled={isBlocked}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.textSecondary} style={styles.icon} />
        ) : (
          <Ionicons
            name={icon}
            size={22}
            color={COLORS.textSecondary}
            style={styles.icon}
          />
        )}
        <Text style={styles.label}>{title}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonOuter: {
    width: "100%",
    marginBottom: 14,
  },
  blocked: { opacity: 0.55 },
  buttonInner: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: { paddingRight: 10 },
  label: { fontSize: 17, fontWeight: "600", color: COLORS.textPrimary },
});
