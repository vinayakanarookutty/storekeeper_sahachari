import React, { useState, useMemo } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useQuery } from '@tanstack/react-query'; // Or your specific react-query path
import { styles } from '../tab_style/analyticsStyle';
import { getToken } from '../services/auth';

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

// ─── Exact Backend Types Matched to JSON ─────────────────────────────────────
interface MongoOid {
  $oid: string;
}

interface MongoDate {
  $date: string;
}

interface OrderItem {
  productId: MongoOid;
  quantity: number;
  price: number;
  _id: MongoOid;
}

interface MobileOrder {
  _id: MongoOid | string;
  userId: MongoOid;
  storeId: MongoOid;
  checkoutId: string;
  deliveryBoyId: string | null;
  items: OrderItem[];
  itemsSubtotal: number;
  deliveryCharge: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  amountPaid: number;
  isPaymentVerified: boolean;
  currency: string;
  createdAt: MongoDate; // Nested field
  updatedAt: MongoDate;
}

export default function AnalyticsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const [chartView, setChartView] = useState<'daily' | 'monthly' | 'Stock'>('daily');

  // ─── Your Token & Base URL configurations ──────────────────────────────────
  // Assuming these are accessible in your file or via imports:
  // const getToken = async () => ...
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

  // ─── The Live Query Hook ───────────────────────────────────────────────────
  const { data: orders = [], isLoading, isRefetching, refetch } = useQuery<MobileOrder[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/storekeeper/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    refetchInterval: 30000, 
  });

  const theme = {
    background: isDark ? '#121212' : '#F4F6F8',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subText: isDark ? '#8E8E93' : '#7A7A7A',
    border: isDark ? '#2C2C2E' : '#E5E7EB',
    primary: '#DAA520',
  };

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

  // ─── Analytical Calculations Adjusted for Mongo Format ──────────────────────
  const analytics = useMemo(() => {
    if (!orders || orders.length === 0) return null;

    let totalRevenue = 0;
    const statusMap: Record<string, number> = {};
    const timelineMap: Record<string, { revenue: number; counts: number }> = {};

    for (const o of orders) {
      // 💡 Important Change: Use native MongoDB structure parsing
      const orderAmt = o.totalAmount || 0;
      totalRevenue += orderAmt;

      statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;

      // Safe check for missing or alternative nested date variations
      const rawDateStr = o.createdAt?.$date || o.createdAt;
      if (!rawDateStr || typeof rawDateStr !== 'string') continue;

      const dateObj = new Date(rawDateStr);
      if (isNaN(dateObj.getTime())) continue;

      const key = chartView === 'daily' 
        ? dateObj.toISOString().slice(5, 10)  // Outputs: "05-23"
        : dateObj.toISOString().slice(0, 7);   // Outputs: "2026-05"

      if (!timelineMap[key]) {
        timelineMap[key] = { revenue: 0, counts: 0 };
      }
      timelineMap[key].revenue += orderAmt;
      timelineMap[key].counts += 1;
    }

    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    const sortedTimeline = Object.keys(timelineMap).sort().map((key) => ({
      label: key,
      ...timelineMap[key],
    }));

    // Keeps chart items neat and clear without text overlaps
    const limitedTimeline = sortedTimeline.slice(-6);

    const peakWindow = sortedTimeline.reduce(
      (max, current) => (current.revenue > max.revenue ? current : max),
      sortedTimeline[0] || { label: 'N/A', revenue: 0, counts: 0 }
    );

    return {
      totalRevenue,
      avgOrderValue,
      statusMap,
      sortedTimeline,
      peakWindow,
      chartLabels: limitedTimeline.map(item => item.label),
      chartRevenues: limitedTimeline.map(item => item.revenue),
      chartOrdersCount: limitedTimeline.map(item => item.counts)
    };
  }, [orders, chartView]);

  // Initial processing setup spinner
  if (isLoading) {
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
      refreshControl={
        <RefreshControl
          refreshing={isRefetching} // 💡 Powered natively by React Query tracking
          onRefresh={refetch}       // 💡 Explicitly invokes react-query cache clear
          colors={[theme.primary]}            
          tintColor={theme.primary}           
          progressBackgroundColor={theme.card} 
        />
      }
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
        <TouchableOpacity
          style={[styles.toggleButton, chartView === 'Stock' && { backgroundColor: theme.primary }]}
          onPress={() => setChartView('Stock')} 
          >
          <Text style={[styles.toggleText, { color: chartView === 'Stock' ? '#FFF' : theme.text }]}>Stoke</Text>
        </TouchableOpacity>
      </View>

      {!analytics ? (
        <View style={styles.centerContainer}>
          <Text style={{ color: theme.subText, marginTop: 40, textAlign: 'center' }}>
            No current order streams detected.
          </Text>
        </View>
      ) : (
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
                width={SCREEN_WIDTH - 64} 
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