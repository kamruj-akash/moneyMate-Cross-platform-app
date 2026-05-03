import React from 'react';
import Svg, { Path, Line, Defs, LinearGradient, Stop, Circle, Text as SvgText } from 'react-native-svg';
import { COLORS, FONT } from '../../constants/theme';

const buildPath = (points, height) => {
  if (points.length === 0) return '';
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cpx = (p0.x + p1.x) / 2;
    d += ` C ${cpx},${p0.y} ${cpx},${p1.y} ${p1.x},${p1.y}`;
  }
  return d;
};

const buildAreaPath = (points, height, padBottom) => {
  if (points.length === 0) return '';
  const line = buildPath(points, height);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x},${height - padBottom} L ${first.x},${height - padBottom} Z`;
};

const LineChart = ({ data = [], width = 320, height = 180 }) => {
  const padding = { top: 16, right: 12, bottom: 24, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const points = data.map((d, i) => ({
    x: padding.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: padding.top + (1 - d.value / max) * innerH,
    value: d.value,
    label: d.label,
  }));

  const linePath = buildPath(points, height);
  const areaPath = buildAreaPath(points, height, padding.bottom);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="gradFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.5" />
          <Stop offset="100%" stopColor={COLORS.primary} stopOpacity="0" />
        </LinearGradient>
      </Defs>
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
      <Path d={areaPath} fill="url(#gradFill)" />
      <Path d={linePath} stroke={COLORS.primary} strokeWidth={2.5} fill="none" />
      {points.map((p, i) => (
        i % Math.ceil(points.length / 8) === 0 ? (
          <SvgText key={`l-${i}`} x={p.x} y={height - 4} fill={COLORS.textMuted} fontSize="10" fontFamily={FONT.medium} textAnchor="middle">
            {p.label}
          </SvgText>
        ) : null
      ))}
      {points.length <= 31
        ? points
          .filter((p) => p.value > 0)
          .map((p, i) => (
            <Circle key={`c-${i}`} cx={p.x} cy={p.y} r={3} fill={COLORS.primary} />
          ))
        : null}
    </Svg>
  );
};

export default LineChart;
