import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { COLORS, FONT } from '../../constants/theme';

const BarsChart = ({ data = [], width = 320, height = 200 }) => {
  const padding = { top: 20, right: 12, bottom: 28, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const groupCount = data.length || 1;
  const groupW = innerW / groupCount;
  const barW = Math.max(4, Math.min(14, (groupW - 12) / 2));

  return (
    <Svg width={width} height={height}>
      {[0.25, 0.5, 0.75].map((p, i) => (
        <Line
          key={i}
          x1={padding.left}
          x2={padding.left + innerW}
          y1={padding.top + innerH * p}
          y2={padding.top + innerH * p}
          stroke={COLORS.border}
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      ))}
      {data.map((d, i) => {
        const cx = padding.left + i * groupW + groupW / 2;
        const incH = (d.income / max) * innerH;
        const expH = (d.expense / max) * innerH;
        return (
          <React.Fragment key={i}>
            <Rect
              x={cx - barW - 2}
              y={padding.top + innerH - incH}
              width={barW}
              height={incH}
              rx={3}
              fill={COLORS.income}
            />
            <Rect
              x={cx + 2}
              y={padding.top + innerH - expH}
              width={barW}
              height={expH}
              rx={3}
              fill={COLORS.expense}
            />
            <SvgText
              x={cx}
              y={height - 8}
              fill={COLORS.textSecondary}
              fontSize="11"
              fontFamily={FONT.medium}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

export default BarsChart;
