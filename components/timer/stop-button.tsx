import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GradientButton } from '@/components/common/gradient-button';

interface StopButtonProps {
  onPress: () => void;
}

export function StopButton({ onPress }: StopButtonProps): React.ReactElement {
  return (
    <GradientButton shape="circle" size={80} onPress={onPress}>
      <View style={styles.icon} />
    </GradientButton>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 20,
    height: 20,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
});
