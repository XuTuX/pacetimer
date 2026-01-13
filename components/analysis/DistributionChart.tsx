import React from "react";
import { useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { COLORS } from "../../lib/theme";

interface DistributionChartProps {
    values: number[];           // All values in the distribution
    myValue: number;            // My value to highlight
    height?: number;
    formatValue?: (val: number) => string;
    showMyLabel?: boolean;
    color?: string;
}

function defaultFormatValue(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
    return `${s}초`;
}

export function DistributionChart({
    values,
    myValue,
    height = 80,
    formatValue = defaultFormatValue,
    showMyLabel = true,
    color = COLORS.primary,
}: DistributionChartProps) {
    const { width } = useWindowDimensions();
    const chartWidth = Math.min(width - 80, 400);
    const chartHeight = height;
    const padding = { left: 10, right: 10, top: 20, bottom: 25 };

    if (values.length < 2) {
        return null;
    }

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    // Create histogram buckets
    const bucketCount = Math.min(10, values.length);
    const bucketWidth = range / bucketCount;
    const buckets = Array(bucketCount).fill(0);

    values.forEach(v => {
        const bucketIdx = Math.min(
            Math.floor((v - minValue) / bucketWidth),
            bucketCount - 1
        );
        buckets[bucketIdx]++;
    });

    const maxBucketCount = Math.max(...buckets);
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;
    const barWidth = graphWidth / bucketCount - 4;

    // My position
    const myPosition = padding.left + ((myValue - minValue) / range) * graphWidth;

    // Create smooth curve for bell-ish shape
    const createBellPath = (): string => {
        if (buckets.length < 2) return "";

        const points = buckets.map((count, idx) => {
            const x = padding.left + (idx + 0.5) * (graphWidth / bucketCount);
            const y = padding.top + graphHeight - (maxBucketCount > 0 ? (count / maxBucketCount) * graphHeight : 0);
            return { x, y };
        });

        // Start from bottom left
        let d = `M ${padding.left},${padding.top + graphHeight}`;

        // Line to first point
        d += ` L ${points[0].x},${points[0].y}`;

        // Smooth curve through points
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const cpx = (prev.x + curr.x) / 2;
            d += ` Q ${prev.x + (curr.x - prev.x) * 0.3},${prev.y} ${cpx},${(prev.y + curr.y) / 2}`;
            d += ` Q ${cpx + (curr.x - cpx) * 0.7},${curr.y} ${curr.x},${curr.y}`;
        }

        // Close path
        d += ` L ${padding.left + graphWidth},${padding.top + graphHeight} Z`;

        return d;
    };

    return (
        <Svg width={chartWidth} height={chartHeight}>
            <Defs>
                <LinearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={color} stopOpacity="0.6" />
                    <Stop offset="1" stopColor={color} stopOpacity="0.1" />
                </LinearGradient>
            </Defs>

            {/* Histogram bars */}
            {buckets.map((count, idx) => {
                const barHeight = maxBucketCount > 0 ? (count / maxBucketCount) * graphHeight : 0;
                const x = padding.left + idx * (graphWidth / bucketCount) + 2;
                const y = padding.top + graphHeight - barHeight;
                const radius = 3;

                return (
                    <G key={idx}>
                        <Path
                            d={`
                                M ${x + radius} ${y}
                                L ${x + barWidth - radius} ${y}
                                Q ${x + barWidth} ${y} ${x + barWidth} ${y + radius}
                                L ${x + barWidth} ${y + barHeight}
                                L ${x} ${y + barHeight}
                                L ${x} ${y + radius}
                                Q ${x} ${y} ${x + radius} ${y}
                                Z
                            `}
                            fill="url(#distGrad)"
                        />
                    </G>
                );
            })}

            {/* My position marker */}
            <Circle
                cx={myPosition}
                cy={padding.top - 6}
                r={6}
                fill={color}
            />
            <Line
                x1={myPosition}
                y1={padding.top}
                x2={myPosition}
                y2={padding.top + graphHeight}
                stroke={color}
                strokeWidth={2}
                strokeDasharray="4 2"
            />

            {/* My label */}
            {showMyLabel && (
                <SvgText
                    x={myPosition}
                    y={chartHeight - 4}
                    fontSize="10"
                    fontWeight="bold"
                    fill={color}
                    textAnchor="middle"
                >
                    나
                </SvgText>
            )}

            {/* Min/Max labels */}
            <SvgText
                x={padding.left}
                y={chartHeight - 4}
                fontSize="9"
                fill={COLORS.textMuted}
                textAnchor="start"
            >
                {formatValue(minValue)}
            </SvgText>
            <SvgText
                x={chartWidth - padding.right}
                y={chartHeight - 4}
                fontSize="9"
                fill={COLORS.textMuted}
                textAnchor="end"
            >
                {formatValue(maxValue)}
            </SvgText>
        </Svg>
    );
}
