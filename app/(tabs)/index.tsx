import { ForgottenTimerModal } from "@/components/timer/forgotten-timer-modal";
import { TimerCard } from "@/components/timer/timer-card";
import { QuickSwitchSection } from "@/components/timer/quick-switch-section";
import { COLORS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { endForgottenEntry, deleteEntry } from "@/db/queries";
import { useTimer } from "@/hooks/useTimer";
import { useForgottenTimer } from "@/hooks/useForgottenTimer";
import { useCategoriesWithActivities } from "@/hooks/useCategoriesWithActivities";
import { NewSessionModal } from "@/components/timer/new-session-modal";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen(): React.ReactElement {
  const {
    runningEntry,
    isLoading,
    startActivity,
    stopActivity,
    switchActivity,
  } = useTimer();
  const { categories, isLoading: categoriesLoading } =
    useCategoriesWithActivities();
  const { forgottenEntry, dismissForgotten } = useForgottenTimer();
  const [modalVisible, setModalVisible] = useState(false);

  const handleForgottenStop = useCallback(
    async (endedAt: Date): Promise<void> => {
      if (forgottenEntry) {
        await endForgottenEntry(forgottenEntry.entryId, endedAt);
        dismissForgotten();
      }
    },
    [forgottenEntry, dismissForgotten],
  );

  const handleForgottenDiscard = useCallback(async (): Promise<void> => {
    if (forgottenEntry) {
      await deleteEntry(forgottenEntry.entryId);
      dismissForgotten();
    }
  }, [forgottenEntry, dismissForgotten]);

  const handleActivityPress = useCallback(
    async (activityId: string): Promise<void> => {
      if (runningEntry) {
        if (runningEntry.activityId !== activityId) {
          await switchActivity(activityId);
        }
      } else {
        await startActivity(activityId);
      }
    },
    [runningEntry, switchActivity, startActivity],
  );

  const handleStartFromModal = useCallback(
    async (activityId: string): Promise<void> => {
      if (runningEntry) {
        await switchActivity(activityId);
      } else {
        await startActivity(activityId);
      }
      setModalVisible(false);
    },
    [runningEntry, switchActivity, startActivity],
  );

  if (isLoading || categoriesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Chronometer</Text>

        {/* Timer Card */}
        <View style={styles.timerCardWrapper}>
          <TimerCard
            runningEntry={runningEntry}
            onStop={stopActivity}
            onStartPress={() => setModalVisible(true)}
          />
        </View>

        {/* Quick Switch Carousel */}
        <QuickSwitchSection
          categories={categories}
          activeActivityId={runningEntry?.activityId ?? null}
          onActivityPress={handleActivityPress}
        />
      </ScrollView>

      {/* New Session Modal */}
      <NewSessionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onStartActivity={handleStartFromModal}
        categories={categories}
      />

      {/* Forgotten Timer Modal */}
      <ForgottenTimerModal
        entry={forgottenEntry}
        onConfirmStop={handleForgottenStop}
        onDismiss={dismissForgotten}
        onDiscard={handleForgottenDiscard}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  title: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
    marginBottom: SPACING["2xl"],
  },
  timerCardWrapper: {
    marginBottom: SPACING["3xl"],
  },
});
