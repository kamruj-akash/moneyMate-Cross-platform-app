import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS, FONT, SPACING } from '../../constants/theme';
import { formatAmount } from '../../utils/currency';

const PieRing = ({ data = [], size = 220, stroke = 28, currency = 'BDT', total }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const t = total ?? data.reduce((s, d) => s + d.amount, 0);

  let offset = 0;
  const segments = data.map((d, i) => {
    const fraction = t > 0 ? d.amount / t : 0;
    const length = fraction * circumference;
    const seg = {
      key: d.category_id || `i-${i}`,
      color: d.color,
      length,
      offset,
    };
    offset += length;
    return seg;
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.surface}
            strokeWidth={stroke}
            fill="none"
          />
          {segments.map((s) => (
            <Circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${s.length} ${circumference}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="butt"
              fill="none"
            />
          ))}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.medium, fontSize: 11, letterSpacing: 1.2 }}>TOTAL</Text>
        <Text style={{ color: COLORS.textPrimary, fontFamily: FONT.semibold, fontSize: 22, marginTop: 4 }}>
          {formatAmount(t, currency)}
        </Text>
      </View>
    </View>
  );
};

export default PieRing;
