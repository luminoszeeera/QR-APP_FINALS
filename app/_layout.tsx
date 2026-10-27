import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import StateView from "@/components/StateView";
import { COLORS } from "@/constants/colors";
import { initAuth, useAuth } from "@/lib/auth";

// Start listening to Supabase auth events (restores a saved session too).
initAuth();

export default function RootLayout() {
  const { session, loading } = useAuth();

  // First launch: wait until the saved session has been checked.
  if (loading && !session) {
    return <StateView kind="loading" message="Checking your session..." />;
  }

  // Route protection: signed-out users can only see login/register,
  // signed-in users can only see the app screens.
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.textPrimary,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="event/[id]"
            options={{ headerShown: true, title: "Event Details" }}
          />
          <Stack.Screen
            name="event/form"
            options={{ headerShown: true, title: "Event" }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
