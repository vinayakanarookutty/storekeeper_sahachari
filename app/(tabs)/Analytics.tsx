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
import { useQuery } from '@tanstack/react-query';
import { styles } from '../tab_style/analyticsStyle';
import { useLanguage } from '../contexts/LanguageContext';

import { getToken } from '../services/auth';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

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

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface MongoOid { $oid: string; }
interface MongoDate { $date: string; }

interface MobileOrder {
  _id: MongoOid | string;
  totalAmount: number;
  status: string;
  createdAt: MongoDate;
}

interface Product {
  _id: MongoOid;
  storeId: MongoOid;
  name: string;
  description: string;
  images: string[];
  quantity: number;
  price: string; 
  category: string;
  createdAt: MongoDate;
  updatedAt: MongoDate;
}

export default function AnalyticsScreen() {
  const { t } = useLanguage();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  
  const [chartView, setChartView] = useState<'daily' | 'monthly' | 'Stock'>('daily');

  // ─── Query 1: Orders Fetching Engine ───────────────────────────────────────
  const { 
    data: orders = [], 
    isLoading: isOrdersLoading, 
    isRefetching: isOrdersRefetching, 
    refetch: refetchOrders 
  } = useQuery<MobileOrder[]>({
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
    enabled: chartView !== 'Stock', 
  });

  // ─── Query 2: Product/Stock Fetching Engine ─────────────────────────────────
  const { 
    data: products = [], 
    isLoading: isProductsLoading, 
    isRefetching: isProductsRefetching, 
    refetch: refetchProducts 
  } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const authToken = await getToken();
      const response = await fetch(`${API_BASE_URL}/storekeeper/products`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    refetchInterval: 60000, 
    enabled: chartView === 'Stock', 
  });

  const handleRefresh = async () => {
    if (chartView === 'Stock') {
      await refetchProducts();
    } else {
      await refetchOrders();
    }
  };

  // Theme Settings
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
  };

  // Dynamic mapper for database statuses to localized UI labels
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PLACED': return t.statusPlaced || t.placed;
      case 'READY': return t.statusReady || t.ready;
      case 'ACCEPTED': return t.statusAccepted || t.accepted;
      case 'PICKED_UP': return t.statusPickedUp || status;
      case 'DELIVERED': return t.statusCompleted || t.delivered;
      case 'CANCELLED': 
      case 'REJECTED': return t.statusRejected || t.rejected;
      case 'FAILED': return t.statusFailed || (t as any)[status.toLowerCase()] || 'FAILED';
      default: return (t as any)[status.toLowerCase()] || status;
    }
  };

  // ─── Memoized Computations for Orders Analytics ─────────────────────────────
  const orderAnalytics = useMemo(() => {
    if (!orders.length || chartView === 'Stock') return null;

    let totalRevenue = 0;
    const statusMap: Record<string, number> = {};
    const timelineMap: Record<string, { revenue: number; counts: number }> = {};

    for (const o of orders) {
      const orderAmt = o.totalAmount || 0;
      totalRevenue += orderAmt;
      statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;

      const rawDateStr = o.createdAt?.$date || o.createdAt;
      if (typeof rawDateStr !== 'string') continue;

      const dateObj = new Date(rawDateStr);
      if (isNaN(dateObj.getTime())) continue;

      const key = chartView === 'daily' 
        ? dateObj.toISOString().slice(5, 10) 
        : dateObj.toISOString().slice(0, 7);

      if (!timelineMap[key]) timelineMap[key] = { revenue: 0, counts: 0 };
      timelineMap[key].revenue += orderAmt;
      timelineMap[key].counts += 1;
    }

    const sortedTimeline = Object.keys(timelineMap).sort().map(key => ({ label: key, ...timelineMap[key] }));
    const limitedTimeline = sortedTimeline.slice(-6);
    const peakWindow = sortedTimeline.reduce((max, curr) => (max.revenue > max.revenue ? curr : max), sortedTimeline[0] || { label: 'N/A', revenue: 0 });

    return {
      totalRevenue,
      avgOrderValue: totalRevenue / orders.length,
      statusMap,
      sortedTimeline,
      peakWindow,
      chartLabels: limitedTimeline.map(i => i.label),
      chartRevenues: limitedTimeline.map(i => i.revenue),
      chartOrdersCount: limitedTimeline.map(i => i.counts)
    };
  }, [orders, chartView]);

  // ─── Memoized Computations for Stock / Inventory Analytics ───────────────────
  const stockAnalytics = useMemo(() => {
    if (!products.length || chartView !== 'Stock') return null;

    let totalItemsStocked = 0;
    let lowStockCount = 0;
    const categoryMap: Record<string, number> = {};

    for (const p of products) {
      const qty = Number(p.quantity) || 0;
      totalItemsStocked += qty;

      if (qty <= 5) lowStockCount++;

      const cat = p.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] ?? 0) + qty;
    }

    const sortedCategories = Object.keys(categoryMap).sort((a, b) => categoryMap[b] - categoryMap[a]);
    const topCategories = sortedCategories.slice(0, 5); 

    return {
      totalUniqueProducts: products.length,
      totalItemsStocked,
      lowStockCount,
      categoryLabels: topCategories,
      categoryVolumes: topCategories.map(cat => categoryMap[cat]),
      allCategoriesBreakdown: Object.entries(categoryMap).sort((a, b) => b[1] - a[1])
    };
  }, [products, chartView]);

  const isDataLoading = chartView === 'Stock' ? isProductsLoading : isOrdersLoading;
  if (isDataLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* ─── FIXED CONTAINER: Keeps the toggle fixed at the top layout level ─── */}
      <View style={[styles.toggleContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.toggleButton, chartView === 'daily' && { backgroundColor: theme.primary }]}
          onPress={() => setChartView('daily')}
        >
          <Text style={[styles.toggleText, { color: chartView === 'daily' ? '#FFF' : theme.text }]}>{t.daily}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, chartView === 'monthly' && { backgroundColor: theme.primary }]}
          onPress={() => setChartView('monthly')}
        >
          <Text style={[styles.toggleText, { color: chartView === 'monthly' ? '#FFF' : theme.text }]}>{t.monthly}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, chartView === 'Stock' && { backgroundColor: theme.primary }]}
          onPress={() => setChartView('Stock')}
        >
          <Text style={[styles.toggleText, { color: chartView === 'Stock' ? '#FFF' : theme.text }]}>{t.stock}</Text>
        </TouchableOpacity>
      </View>

      {/* ─── SCROLLABLE DATA MATRIX CONTAINER ─── */}
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl = {
          <RefreshControl
            refreshing={chartView === 'Stock' ? isProductsRefetching : isOrdersRefetching}
            onRefresh={handleRefresh}
            colors={[theme.primary]}            
            tintColor={theme.primary}           
            progressBackgroundColor={theme.card} 
          />
        }
       >
        {/* ─── RENDER ENGINE A: STOCK VIEW ──────────────────────────────────────── */}
        {chartView === 'Stock' && stockAnalytics && (
          <>
            {/* Inventory Grid Matrix */}
            <View style={styles.gridRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>{t.createProductBtn || 'Unique Products'}</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{stockAnalytics.totalUniqueProducts}</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>{t.stockQty || 'Total Stock'}</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{stockAnalytics.totalItemsStocked}</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: stockAnalytics.lowStockCount > 0 ? '#ef4444' : theme.border, borderWidth: stockAnalytics.lowStockCount > 0 ? 1 : 0 }]}>
                <Text style={[styles.metricLabel, { color: stockAnalytics.lowStockCount > 0 ? '#ef4444' : theme.subText }]}>{t.inStock ? `${t.stock} (≤5)` : 'Low Stock Alerts (≤5)'}</Text>
                <Text style={[styles.metricValue, { color: stockAnalytics.lowStockCount > 0 ? '#ef4444' : theme.text }]}>
                  {stockAnalytics.lowStockCount} {t.noProducts ? t.noProducts.split(' ').pop() : 'Items'}
                </Text>
              </View>
            </View>

            {/* Category Distribution Chart */}
            {stockAnalytics.categoryLabels.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.selectCategory || 'Top Stock Categories'}</Text>
                <BarChart
                  data={{
                    labels: stockAnalytics.categoryLabels,
                    datasets: [{ data: stockAnalytics.categoryVolumes }],
                  }}
                  width={SCREEN_WIDTH - 64}
                  height={200}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, 
                  }}
                  style={styles.chartCanvas}
                  verticalLabelRotation={15} 
                />
              </View>
            )}

            {/* Tabular Detailed Inventory Logs */}
            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.subText }]}>{t.myInventory?.toUpperCase() || 'ALL CATEGORY BREAKDOWN'}</Text>
              {stockAnalytics.allCategoriesBreakdown.map(([catName, qty], idx) => (
                <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <Text style={{ color: theme.text, fontWeight: '600', flex: 2 }}>{catName}</Text>
                  <Text style={{ color: theme.primary, fontWeight: '700', flex: 1, textAlign: 'right' }}>{qty} Units</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ─── RENDER ENGINE B: ORDERS VIEW (Daily / Monthly) ───────────────────── */}
        {chartView !== 'Stock' && orderAnalytics && (
          <>
            {/* Metrics Grid Matrix */}
            <View style={styles.gridRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>{t.totalRevenue}</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  ₹{orderAnalytics.totalRevenue.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>Avg Order Value</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  ₹{Math.round(orderAnalytics.avgOrderValue).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>{t.totalOrders}</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{orders.length}</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>Peak Performance</Text>
                <Text style={[styles.metricValue, { color: theme.text, fontSize: 15 }]} numberOfLines={1}>
                  {orderAnalytics.peakWindow.label} (₹{orderAnalytics.peakWindow.revenue})
                </Text>
              </View>
            </View>

            {/* Revenue Chart Layout */}
            {orderAnalytics.chartLabels.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.totalRevenue} Timeline (₹)</Text>
                <LineChart
                  data={{
                    labels: orderAnalytics.chartLabels,
                    datasets: [{ data: orderAnalytics.chartRevenues }],
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

            {/* Orders Count Tracker Bar Graph */}
            {orderAnalytics.chartLabels.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.totalOrders} Tracker</Text>
                <BarChart
                  data={{
                    labels: orderAnalytics.chartLabels,
                    datasets: [{ data: orderAnalytics.chartOrdersCount }],
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
                />
              </View>
            )}

            {/* Table Breakdown Logging */}
            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.subText }]}>{t.totalRevenue?.toUpperCase()} TIMELINE BREAKDOWN</Text>
              {orderAnalytics.sortedTimeline.map((item, idx) => (
                <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{item.label}</Text>
                  <Text style={{ color: theme.subText }}>{item.counts} {t.totalOrders ? t.totalOrders.split(' ').pop() : 'Orders'}</Text>
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>₹{item.revenue}</Text>
                </View>
              ))}
            </View>

            {/* Order Status Allocation Progress Tracks */}
            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.subText }]}>{t.all || 'ORDER STATUS ALLOCATION'}</Text>
              {Object.entries(orderAnalytics.statusMap).map(([statusName, count], idx) => {
                const allocationPercentage = ((count / orders.length) * 100).toFixed(0);
                const statusColor = STATUS_COLORS[statusName] ?? '#9ca3af';

                return (
                  <View key={idx} style={styles.statusRowContainer}>
                    <View style={styles.statusMetaTextRow}>
                      <View style={styles.statusIndicatorLabel}>
                        <View style={[styles.colorDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusTextName, { color: theme.text }]}>{getStatusLabel(statusName)}</Text>
                      </View>
                      <Text style={[styles.statusCountVal, { color: theme.text }]}>
                        {count} ({allocationPercentage}%)
                      </Text>
                    </View>
                    <View style={[styles.progressBarBackground, { backgroundColor: isDark ? '#2c2c2e' : '#e5e7eb' }]}>
                      <View style={[styles.progressBarFill, { backgroundColor: statusColor, width: `${allocationPercentage}%` as any }]} /> 
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Empty State Layout Layer Exception Case */}
        {((chartView === 'Stock' && !stockAnalytics) || (chartView !== 'Stock' && !orderAnalytics)) && (
          <View style={styles.centerContainer}>
            <Text style={{ color: theme.subText, marginTop: 40, textAlign: 'center' }}>
              {t.noOrdersFound || 'No information profile logs available for this database module.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}