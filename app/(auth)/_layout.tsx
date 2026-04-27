import { Stack } from "expo-router";
import React from "react";

export default function AuthLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerTitle: "",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
