import React from "react";
import { useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { COLORS } from "../../lib/theme";

interface DataPoint {
    id: string;
    title: string;
    date: Date;
    val: number;  // Value (e.g., duration per question in ms)
}

interface GrowthChartProps {
    data: DataPoint[];
    height?: number;
    formatValue?: (val: number) => string;
    showLabels?: boolean;
}

function defaultFormatValue(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
    return `${s}초`;
}

export function GrowthChart({
    data,
    height = 180,
    formatValue = defaultFormatValue,
    showLabels = true,
}: GrowthChartProps) {
    const { width } = useWindowDimensions();
    const graphWidth = Math.min(width - 72, 500);
    const graphHeight = height;
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };

    if (data.length < 2) {
        return null;
    }

    const maxVal = Math.max(...data.map(h => h.val));
    const minVal = Math.min(...data.map(h => h.val));
    const valRange = maxVal - minVal || 1;

    // Calculate axis values
    const yAxisSteps = 4;
    const yAxisValues = Array.from({ length: yAxisSteps + 1 }, (_, i) =>
        maxVal - (i * valRange / yAxisSteps)
    );

    const points = data.map((h, i) => {
        const x = padding.left + (i / (data.length - 1)) * (graphWidth - padding.left - padding.right);
        const normalizedY = (h.val - minVal) / valRange;
        const y = padding.top + (1 - normalizedY) * (graphHeight - padding.top - padding.bottom);
        return { x, y, val: h.val, date: h.date, title: h.title };
    });

    // Create smooth curve path
    const createSmoothPath = (pts: typeof points): string => {
        if (pts.length < 2) return "";
        let d = `M ${pts[0].x},${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const curr = pts[i];
            const cp1x = prev.x + (curr.x - prev.x) / 3;
            const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;
            d += ` C ${cp1x},${prev.y} ${cp2x},${curr.y} ${curr.x},${curr.y}`;
        }
        return d;
    };

    const pathD = createSmoothPath(points);
    const areaPath = pathD + ` L ${points[points.length - 1].x},${graphHeight - padding.bottom} L ${points[0].x},${graphHeight - padding.bottom} Z`;

    return (
        <Svg width={graphWidth} height={graphHeight}>
            <Defs>
                <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.3" />
                    <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0" />
                </LinearGradient>
                <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.8" />
                    <Stop offset="1" stopColor={COLORS.primaryDark || COLORS.primary} stopOpacity="1" />
                </LinearGradient>
            </Defs>

            {/* Y-axis labels */}
            {yAxisValues.map((val, i) => {
                const y = padding.top + (i * (graphHeight - padding.top - padding.bottom) / yAxisSteps);
                return (
                    <G key={`y-${i}`}>
                        <Line
                            x1={padding.left}
                            y1={y}
                            x2={graphWidth - padding.right}
                            y2={y}
                            stroke={COLORS.border}
                            strokeWidth={1}
                            strokeDasharray={i === yAxisSteps ? undefined : "4 4"}
                        />
                        <SvgText
                            x={padding.left - 8}
                            y={y + 4}
                            fontSize="10"
                            fill={COLORS.textMuted}
                            textAnchor="end"
                        >
                            {formatValue(val)}
                        </SvgText>
                    </G>
                );
            })}

            {/* Area Fill */}
            <Path d={areaPath} fill="url(#areaGrad)" />

            {/* Line */}
            <Path d={pathD} stroke="url(#lineGrad)" strokeWidth={3} fill="none" strokeLinecap="round" />

            {/* Points and Labels */}
            {points.map((p, i) => (
                <G key={i}>
                    {/* Outer glow */}
                    <Circle cx={p.x} cy={p.y} r={8} fill={COLORS.primary} opacity={0.2} />
                    {/* Main dot */}
                    <Circle cx={p.x} cy={p.y} r={5} fill={COLORS.white || '#fff'} stroke={COLORS.primary} strokeWidth={2.5} />

                    {/* Value label for first, last, and min/max */}
                    {showLabels && (i === 0 || i === points.length - 1 ||
                        p.val === Math.min(...points.map(pt => pt.val)) ||
                        p.val === Math.max(...points.map(pt => pt.val))) && (
                            <SvgText
                                x={p.x}
                                y={p.y - 14}
                                fontSize="11"
                                fontWeight="bold"
                                fill={i === points.length - 1 ? COLORS.primary : COLORS.text}
                                textAnchor="middle"
                            >
                                {formatValue(p.val)}
                            </SvgText>
                        )}

                    {/* Date label */}
                    <SvgText
                        x={p.x}
                        y={graphHeight - padding.bottom + 16}
                        fontSize="10"
                        fill={COLORS.textMuted}
                        textAnchor="middle"
                    >
                        {`${p.date.getMonth() + 1}/${p.date.getDate()}`}
                    </SvgText>
                </G>
            ))}
        </Svg>
    );
}
