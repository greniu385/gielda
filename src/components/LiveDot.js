import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { NATIVE_DRIVER } from '../utils/animation';

// Pulsująca kropka sygnalizująca, że symulacja rynku działa.
export default function LiveDot({ color, active = true, size = 8 }) {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) {
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: NATIVE_DRIVER }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <View style={{ width: size * 2.6, height: size * 2.6, alignItems: 'center', justifyContent: 'center' }}>
      {active ? (
        <Animated.View
          style={[
            styles.ring,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity, transform: [{ scale }] },
          ]}
        />
      ) : null}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute' },
});
