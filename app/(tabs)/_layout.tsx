import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import StateView from "@/components/StateView";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/lib/auth";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} color={color} size={24} />
  );
}

export default function TabLayout() {
  const { role, loading } = useAuth();

  if (loading || !role) {
    return <StateView kind="loading" message="Loading your account..." />;
  }

  // Role-based navigation: tabs that do not belong to the role are hidden
  // (href: null). Each screen also checks the role itself, and the database
  // enforces it again with Row Level Security.
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        headerStyle: { backgroundColor: COLORS.card },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,
        tabBarStyle: { backgroundColor: COLORS.card },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: tabIcon("home-sharp", "home-outline") }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: role === "student" ? "Events" : "Manage Events",
          tabBarLabel: "Events",
          tabBarIcon: tabIcon("calendar", "calendar-outline"),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          href: role === "student" ? undefined : null,
          tabBarIcon: tabIcon("qr-code", "qr-code-outline"),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: role === "student" ? "My Attendance" : "Attendance",
          tabBarLabel: role === "student" ? "History" : "Records",
          tabBarIcon: tabIcon("time", "time-outline"),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Manage Users",
          tabBarLabel: "Users",
          href: role === "admin" ? undefined : null,
          tabBarIcon: tabIcon("people", "people-outline"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: tabIcon("person", "person-outline") }}
      />
    </Tabs>
  );
}
