import { StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@powersync/react';
import { Text, View } from '@/components/Themed';
import { useTimer } from '@/hooks/useTimer';
import { useElapsedTime } from '@/hooks/useElapsedTime';
import { formatTimerDisplay } from '@/lib/timezone';

interface ActivityRow {
  id: string;
  name: string;
  category_name: string;
  category_color: string;
}

const ACTIVITIES_QUERY = `
  SELECT
    a.id,
    a.name,
    c.name AS category_name,
    c.color AS category_color
  FROM activities a
  JOIN categories c ON c.id = a.category_id
  WHERE a.is_archived = 0 AND a.deleted_at IS NULL
    AND c.is_archived = 0 AND c.deleted_at IS NULL
  ORDER BY c.sort_order, a.sort_order, a.name
`;

export default function HomeScreen() {
  const { runningEntry, isLoading, startActivity, stopActivity, switchActivity } = useTimer();
  const { data: activities } = useQuery<ActivityRow>(ACTIVITIES_QUERY);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Running Timer */}
      {runningEntry ? (
        <View style={[styles.timerBox, { borderColor: runningEntry.categoryColor }]}>
          <Text style={styles.timerLabel}>Currently tracking:</Text>
          <Text style={[styles.timerActivity, { color: runningEntry.categoryColor }]}>
            {runningEntry.activityName}
          </Text>
          <Text style={styles.timerCategory}>{runningEntry.categoryName}</Text>
          <Text style={styles.timerTime}>
            {formatTimerDisplay(runningEntry.elapsedSeconds)}
          </Text>
          <Pressable style={styles.stopButton} onPress={stopActivity}>
            <Text style={styles.stopButtonText}>Stop</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.timerBox}>
          <Text style={styles.timerLabel}>No timer running</Text>
          <Text style={styles.timerHint}>Tap an activity below to start</Text>
        </View>
      )}

      {/* Activity List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {activities.map((activity) => (
          <Pressable
            key={activity.id}
            style={[
              styles.activityRow,
              { borderLeftColor: activity.category_color },
              runningEntry?.activityId === activity.id && styles.activityRowActive,
            ]}
            onPress={() => {
              if (runningEntry) {
                if (runningEntry.activityId !== activity.id) {
                  switchActivity(activity.id);
                }
              } else {
                startActivity(activity.id);
              }
            }}
          >
            <Text style={styles.activityName}>{activity.name}</Text>
            <Text style={[styles.activityCategory, { color: activity.category_color }]}>
              {activity.category_name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  timerBox: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 14,
    opacity: 0.6,
  },
  timerHint: {
    fontSize: 14,
    opacity: 0.4,
    marginTop: 4,
  },
  timerActivity: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  timerCategory: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  timerTime: {
    fontSize: 40,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    marginTop: 8,
  },
  stopButton: {
    marginTop: 12,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 8,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  activityRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ccc',
    marginBottom: 8,
    backgroundColor: 'rgba(128,128,128,0.05)',
    borderRadius: 6,
  },
  activityRowActive: {
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  activityName: {
    fontSize: 16,
    fontWeight: '500',
  },
  activityCategory: {
    fontSize: 12,
    marginTop: 2,
  },
});
