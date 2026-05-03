import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useSharedValue, useDerivedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { formatAmount } from '../utils/currency';

const AnimatedNumber = ({ value, currency = 'BDT', style, prefix = '', signed = false }) => {
  const [display, setDisplay] = useState(0);
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = withTiming(Number(value) || 0, { duration: 700 });
  }, [value]);

  useDerivedValue(() => {
    runOnJS(setDisplay)(Math.round(sv.value));
  }, [sv]);

  const formatted = signed
    ? `${display >= 0 ? '+' : ''}${formatAmount(display, currency)}`
    : `${prefix}${formatAmount(display, currency)}`;
  return <Text style={style}>{formatted}</Text>;
};

export default AnimatedNumber;
