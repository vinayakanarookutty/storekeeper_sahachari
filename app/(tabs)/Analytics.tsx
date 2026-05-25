import React, { useState, useMemo, useEffect } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { styles } from '../tab_style/analyticsStyle';

// ─── Constants & Types ────────────────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get('window').width;

const STATUS_COLORS: Record<string, string> = {
  PLACED: '#3b82f6',
  READY: '#f59e0b',
  ACCEPTED: '#8b5cf6',
  PICKED_UP: '#06b6d4',
  DELIVERED: '#10b981',
  FAILED: '#ef4444',
  CANCELLED: '#6b7280',
  REJECTED: '#f97316',
};

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

interface MobileOrder {
  _id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

export default function AnalyticsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  // ─── Component States ───────────────────────────────────────────────────────
  const [orders, setOrders] = useState<MobileOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartView, setChartView] = useState<'daily' | 'monthly'>('daily');

  // ─── Theme Management ──────────────────────────────────────────────────────
  const theme = {
    background: isDark ? '#121212' : '#F4F6F8',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subText: isDark ? '#8E8E93' : '#7A7A7A',
    border: isDark ? '#2C2C2E' : '#E5E7EB',
    primary: '#DAA520',
  };

  // ─── Chart Toolkit Theme Options ───────────────────────────────────────────
  const chartConfig = {
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(218, 165, 32, ${opacity})`, 
    labelColor: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '26, 26, 26'}, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.primary,
    },
  };

  // ─── Mock Ingestion API Payload Pipeline ────────────────────────────────────
  useEffect(() => {
    const fetchMockData = async () => {
      try {
        setLoading(true);
        const sampleOrders: MobileOrder[] = [
          { _id: '1', status: 'DELIVERED', totalAmount: 450, createdAt: '2026-05-23T12:00:00.000Z', items: [] },
          { _id: '2', status: 'DELIVERED', totalAmount: 200, createdAt: '2026-05-24T14:30:00.000Z', items: [] },
          { _id: '3', status: 'PLACED', totalAmount: 90, createdAt: '2026-05-25T09:15:00.000Z', items: [] },
          { _id: '4', status: 'READY', totalAmount: 600, createdAt: '2026-05-25T11:00:00.000Z', items: [] },
        ];
        setOrders(sampleOrders);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMockData();
  }, []);

  // ─── Analytical Computations & Data Maps ────────────────────────────────────
  const analytics = useMemo(() => {
    if (!orders.length) return null;

    let totalRevenue = 0;
    const statusMap: Record<string, number> = {};
    const timelineMap: Record<string, { revenue: number; counts: number }> = {};

    for (const o of orders) {
      const orderAmt = Number(o.totalAmount) || 0;
      totalRevenue += orderAmt;

      statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;

      const dateObj = new Date(o.createdAt);
      const key = chartView === 'daily' 
        ? dateObj.toISOString().slice(5, 10)  // "MM-DD" style match for short chart labels
        : dateObj.toISOString().slice(0, 7);   // "YYYY-MM"

      if (!timelineMap[key]) {
        timelineMap[key] = { revenue: 0, counts: 0 };
      }
      timelineMap[key].revenue += orderAmt;
      timelineMap[key].counts += 1;
    }

    const avgOrderValue = totalRevenue / orders.length;

    const sortedTimeline = Object.keys(timelineMap).sort().map((key) => ({
      label: key,
      ...timelineMap[key],
    }));

    const peakWindow = sortedTimeline.reduce(
      (max, current) => (current.revenue > max.revenue ? current : max),
      sortedTimeline[0] || { label: 'N/A', revenue: 0, counts: 0 }
    );

    // Extraction vectors targeted explicitly at ChartKit engines
    const chartLabels = sortedTimeline.map(item => item.label);
    const chartRevenues = sortedTimeline.map(item => item.revenue);
    const chartOrdersCount = sortedTimeline.map(item => item.counts);

    return {
      totalRevenue,
      avgOrderValue,
      statusMap,
      sortedTimeline,
      peakWindow,
      chartLabels,
      chartRevenues,
      chartOrdersCount
    };
  }, [orders, chartView]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      contentContainerStyle={styles.scrollContent}
    >
      {/* View Engine Toggle Bar */}
      <View style={[styles.toggleContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.toggleButton, chartView === 'daily' && { backgroundColor: theme.primary }]}
          onPress={() => setChartView('daily')}
        >
          <Text style={[styles.toggleText, { color: chartView === 'daily' ? '#FFF' : theme.text }]}>Daily</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, chartView === 'monthly' && { backgroundColor: theme.primary }]}
          onPress={() => setChartView('monthly')}
        >
          <Text style={[styles.toggleText, { color: chartView === 'monthly' ? '#FFF' : theme.text }]}>Monthly</Text>
        </TouchableOpacity>
      </View>

      {analytics && (
        <>
          {/* Metrics Grid Matrix */}
          <View style={styles.gridRow}>
            <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.metricLabel, { color: theme.subText }]}>Total Revenue</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>
                ₹{analytics.totalRevenue.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.metricLabel, { color: theme.subText }]}>Avg Order Value</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>
                ₹{Math.round(analytics.avgOrderValue).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.metricLabel, { color: theme.subText }]}>Total Orders</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>{orders.length}</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.metricLabel, { color: theme.subText }]}>Peak Performance</Text>
              <Text style={[styles.metricValue, { color: theme.text, fontSize: 15 }]} numberOfLines={1}>
                {analytics.peakWindow.label} (₹{analytics.peakWindow.revenue})
              </Text>
            </View>
          </View>

          {/* 1. Revenue Area Chart Graphic */}
          {analytics.chartLabels.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Revenue Timeline (₹)</Text>
              <LineChart
                data={{
                  labels: analytics.chartLabels,
                  datasets: [{ data: analytics.chartRevenues }],
                }}
                width={SCREEN_WIDTH - 32 - 32} 
                height={180}
                yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={chartConfig}
                bezier
                style={styles.chartCanvas}
              />
            </View>
          )}

          {/* 2. Order Frequency Volume Bar Chart */}
          {analytics.chartLabels.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Orders Volume Tracker</Text>
              <BarChart
                data={{
                  labels: analytics.chartLabels,
                  datasets: [{ data: analytics.chartOrdersCount }],
                }}
                width={SCREEN_WIDTH - 64}
                height={180}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                }}
                style={styles.chartCanvas}
                verticalLabelRotation={0}
              />
            </View>
          )}

          {/* Tabular Numerical Logs Breakdown */}
          <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.subText }]}>REVENUE TIMELINE BREAKDOWN</Text>
            {analytics.sortedTimeline.map((item, idx) => (
              <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>{item.label}</Text>
                <Text style={{ color: theme.subText }}>{item.counts} Orders</Text>
                <Text style={{ color: theme.primary, fontWeight: '700' }}>₹{item.revenue}</Text>
              </View>
            ))}
          </View>

          {/* Categorical Progress Allocations */}
          <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.subText }]}>ORDER STATUS ALLOCATION</Text>
            {Object.entries(analytics.statusMap).map(([statusName, count], idx) => {
              const allocationPercentage = ((count / orders.length) * 100).toFixed(0);
              const statusColor = STATUS_COLORS[statusName] ?? '#9ca3af';

              return (
                <View key={idx} style={styles.statusRowContainer}>
                  <View style={styles.statusMetaTextRow}>
                    <View style={styles.statusIndicatorLabel}>
                      <View style={[styles.colorDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusTextName, { color: theme.text }]}>{statusName}</Text>
                    </View>
                    <Text style={[styles.statusCountVal, { color: theme.text }]}>
                      {count} ({allocationPercentage}%)
                    </Text>
                  </View>
                  <View style={[styles.progressBarBackground, { backgroundColor: isDark ? '#2c2c2e' : '#e5e7eb' }]}>
                    <View 
                   style={[
    styles.progressBarFill, 
    { backgroundColor: statusColor, width: `${allocationPercentage}%` as any }
  ]} 
/> 
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}
