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
  CANCEL_PENDING: '#f43f5e',
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

// 🪙 Interface definition for active commission rules payload
interface CommissionRule {
  storekeeperId: string;
  percentage: number;
}

interface UserProfile {
  _id: string;
  name: string;
  email: string;
}

export default function AnalyticsScreen() {
  const { t, language } = useLanguage();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  
  const [chartView, setChartView] = useState<'daily' | 'monthly' | 'Stock'>('daily');

  // ─── Query 0A: Profile Context Resolution ──────────────────────────────────
  const { data: userData } = useQuery<UserProfile>({
    queryKey: ['currentUserProfileAnalyticsContext'],
    queryFn: async () => {
      const authToken = await getToken();
      const res = await fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${authToken}` } });
      return res.json();
    },
  });

  // ─── Query 0B: Commission Fetching Engine ──────────────────────────────────
  const { data: commission = { storekeeperId: '', percentage: 0 }, isLoading: isCommissionLoading } = useQuery<CommissionRule>({
    queryKey: ['storekeeperCommissionAnalytics', userData?._id],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/commission/store/${userData?._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) return { storekeeperId: userData?._id || '', percentage: 0 };
      return res.json();
    },
    enabled: !!userData?._id,
  });

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

  // ─── Global Chart Template Settings ───────────────────────────────────────
  const chartConfig = {
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(218, 165, 32, ${opacity})`, 
    labelColor: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '26, 26, 26'}, ${opacity})`,
    style: { borderRadius: 16 },
    propsForLabels: {
      fontSize: 10,
    },
  };

  // Helper localizer mapping for categories 
  const getLocalizedCategory = (category: string) => {
    if (!category) return '';
    const normalized = category.trim().toLowerCase();
    
    if (normalized === 'ഭക്ഷണം') return t.food;
    if (normalized === 'പാനീയങ്ങൾ') return t.beverages;
    if (normalized === 'സേവനം') return t.service;
    if (normalized === 'ഹോംമെയ്ഡ്' || normalized === 'ഹോം മെയ്ഡ്') return t['home made'];
    if (normalized === 'പച്ചക്കറികളുംപഴങ്ങളും' || normalized === 'പച്ചക്കറികളും പഴങ്ങളും') return t['vegetables and fruits'];
    if (normalized === 'ഫാസ്റ്റ്ഫുഡ്' || normalized === 'ഫാസ്റ്റ് ഫുഡ്') return t['fast food'];
    if (normalized === 'സ്നാക്ക്സ്') return t.snacks;
    
    return (t as any)[normalized] || category;
  };

  // Dynamic mapper for database statuses to localized UI labels
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PLACED': return t.statusPlaced;
      case 'READY': return t.statusReady;
      case 'ACCEPTED': return t.statusAccepted;
      case 'PICKED_UP': return t.statusPickedUp;
      case 'DELIVERED': return t.statusCompleted;
      case 'CANCELLED': return t.statusCancelled;
      case 'CANCEL_PENDING': return (t as any).statusCancelPending || 'CANCEL_PENDING'; 
      case 'REJECTED': return t.statusRejected;
      case 'FAILED': return t.statusFailed;
      default: return (t as any)[status.toLowerCase()] || status;
    }
  };

  // ─── Memoized Computations for Orders Analytics ─────────────────────────────
  const orderAnalytics = useMemo(() => {
    if (!orders.length || chartView === 'Stock') return null;

    let totalRevenue = 0;
    let completedRevenue = 0; 
    let activePeriodOrderCount = 0;
    const statusMap: Record<string, number> = {};
    const timelineMap: Record<string, { revenue: number; counts: number }> = {};

    // Get current time strings to filter active metrics window
    const now = new Date();
    const currentDayStr = now.toISOString().slice(5, 10); // e.g., "06-22"
    const currentMonthStr = now.toISOString().slice(0, 7); // e.g., "2026-06"

    for (const o of orders) {
      const rawDateStr = o.createdAt?.$date || o.createdAt;
      if (typeof rawDateStr !== 'string') continue;

      const dateObj = new Date(rawDateStr);
      if (isNaN(dateObj.getTime())) continue;

      // Extract comparison keys
      const dayKey = dateObj.toISOString().slice(5, 10);
      const monthKey = dateObj.toISOString().slice(0, 7);
      const activeTimelineKey = chartView === 'daily' ? dayKey : monthKey;

      // 1. Build the overall chart timeline arrays
      if (!timelineMap[activeTimelineKey]) timelineMap[activeTimelineKey] = { revenue: 0, counts: 0 };
      timelineMap[activeTimelineKey].revenue += o.totalAmount || 0;
      timelineMap[activeTimelineKey].counts += 1;

      // 2. 🎯 CRITICAL FIX: Filter top card metrics based on active toggle view
      const isMatch = chartView === 'daily' 
        ? dayKey === currentDayStr 
        : monthKey === currentMonthStr;

      if (isMatch) {
        const orderAmt = o.totalAmount || 0;
        totalRevenue += orderAmt;
        activePeriodOrderCount++;
        statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;

        if (o.status === 'DELIVERED') {
          completedRevenue += orderAmt;
        }
      }
    }

    const sortedTimeline = Object.keys(timelineMap).sort().map(key => ({ label: key, ...timelineMap[key] }));
    const limitedTimeline = sortedTimeline.slice(-6);
    const peakWindow = sortedTimeline.reduce((max, curr) => (curr.revenue > max.revenue ? curr : max), sortedTimeline[0] || { label: 'N/A', revenue: 0 });

    const rate = commission?.percentage || 0;
    const netStoreKeeperEarnings = (completedRevenue * rate) / 100; 
    const adminShare = completedRevenue - netStoreKeeperEarnings;

    return {
      totalRevenue,
      completedRevenue,
      adminShare,
      netStoreKeeperEarnings,
      activePeriodOrderCount,
      avgOrderValue: activePeriodOrderCount > 0 ? totalRevenue / activePeriodOrderCount : 0,
      statusMap,
      sortedTimeline,
      peakWindow,
      chartLabels: limitedTimeline.map(i => i.label),
      chartRevenues: limitedTimeline.map(i => i.revenue),
      chartOrdersCount: limitedTimeline.map(i => i.counts)
    };
  }, [orders, chartView, commission]);

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
      categoryLabels: topCategories.map(cat => getLocalizedCategory(cat)),
      categoryVolumes: topCategories.map(cat => categoryMap[cat]),
      allCategoriesBreakdown: Object.entries(categoryMap).sort((a, b) => b[1] - a[1])
    };
  }, [products, chartView, t]);

  const isDataLoading = chartView === 'Stock' ? isProductsLoading : (isOrdersLoading || isCommissionLoading);
  if (isDataLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Toggle View Controller Component Header */}
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

      {/* Main Data Layout Stream Area */}
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
        {/* ─── ORDERS VIEW (Daily / Monthly) ─── */}
        {chartView !== 'Stock' && orderAnalytics && (
          <>
            {/* 🪙 STOREKEEPER REWARD EARNINGS PANEL */}
<View style={[styles.sectionCard, { backgroundColor: theme.card, borderLeftWidth: 5, borderLeftColor: '#10b981' }]}>
  <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12, fontSize: 16 }]}>
    {language === 'ml' ? 'കമ്മീഷൻ വരുമാന വിവരങ്ങൾ' : 'App Commission Earnings'}
  </Text>
  
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
    <Text style={{ color: theme.subText }}>{language === 'ml' ? 'നിങ്ങളുടെ കമ്മീഷൻ നിരക്ക്' : 'App Commission Rate'}</Text>
    <Text style={{ color: theme.text, fontWeight: '700' }}>{commission?.percentage || 0}%</Text>
  </View>

  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
    <Text style={{ color: theme.subText }}>{language === 'ml' ? 'ആകെ വിൽപന' : 'Total Sales Volume'}</Text>
    <Text style={{ color: theme.text, fontWeight: '600' }}>₹{orderAnalytics.completedRevenue.toLocaleString('en-IN')}</Text>
  </View>

  <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 8 }} />

  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{language === 'ml' ? 'നിങ്ങൾ നേടിയ കമ്മീഷൻ' : 'Total Platform Fee'}</Text>
    <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 20 }}>
      ₹{Math.round(orderAnalytics.netStoreKeeperEarnings).toLocaleString('en-IN')}
    </Text>
  </View>
</View>

            <View style={styles.gridRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>{t.totalRevenue}</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
  {orderAnalytics.activePeriodOrderCount}
</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>{t.avgOrderValue}</Text>
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
                <Text style={[styles.metricLabel, { color: theme.subText }]}>{t.peakPerformance}</Text>
                <Text style={[styles.metricValue, { color: theme.text, fontSize: 15 }]} numberOfLines={1}>
                  {orderAnalytics.peakWindow.label} (₹{orderAnalytics.peakWindow.revenue})
                </Text>
              </View>
            </View>

            {/* Total Revenue Timeline Chart Layout */}
            {orderAnalytics.chartLabels.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.card, paddingRight: 24 }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.revenueTimelineTitle}</Text>
                <LineChart
                  data={{
                    labels: orderAnalytics.chartLabels,
                    datasets: [{ data: orderAnalytics.chartRevenues }],
                  }}
                  width={SCREEN_WIDTH - 50} 
                  height={190}
                  yAxisLabel="₹"
                  yAxisSuffix=""
                  chartConfig={chartConfig}
                  bezier
                  style={{
                    ...styles.chartCanvas,
                    paddingLeft: 12, 
                  }}
                />
              </View>
            )}

            {/* Total Orders Tracker Graph Layout */}
            {orderAnalytics.chartLabels.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.card, paddingRight: 24 }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.ordersTrackerTitle}</Text>
                <BarChart
                  data={{
                    labels: orderAnalytics.chartLabels,
                    datasets: [{ data: orderAnalytics.chartOrdersCount }],
                  }}
                  width={SCREEN_WIDTH - 50}
                  height={190}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  }}
                  style={{
                    ...styles.chartCanvas,
                    paddingLeft: 12, 
                  }}
                />
              </View>
            )}

            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.subText }]}>
                {t.revenueTimelineBreakdown}
              </Text>
              {orderAnalytics.sortedTimeline.map((item, idx) => (
                <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{item.label}</Text>
                  <Text style={{ color: theme.subText }}>
                    {item.counts} {item.counts === 1 ? ((t as any).orderLabelSingular || 'Order') : t.ordersLabel}
                  </Text>
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>₹{item.revenue}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.subText }]}>{t.orderStatusAllocation}</Text>
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

        {/* ─── STOCK VIEW ─── */}
        {chartView === 'Stock' && stockAnalytics && (
          <>
            <View style={styles.gridRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>{t.uniqueProducts}</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{stockAnalytics.totalUniqueProducts}</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>{t.totalStock}</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{stockAnalytics.totalItemsStocked}</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: stockAnalytics.lowStockCount > 0 ? '#ef4444' : theme.border, borderWidth: stockAnalytics.lowStockCount > 0 ? 1 : 0 }]}>
                <Text style={[styles.metricLabel, { color: stockAnalytics.lowStockCount > 0 ? '#ef4444' : theme.subText }]}>{t.lowStockAlerts}</Text>
                <Text style={[styles.metricValue, { color: stockAnalytics.lowStockCount > 0 ? '#ef4444' : theme.text }]}>
                  {stockAnalytics.lowStockCount} {t.itemsLabel}
                </Text>
              </View>
            </View>

            {/* Category Stock BarChart */}
            {stockAnalytics.categoryLabels.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.card, paddingRight: 20 }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.topStockCategories}</Text>
                <BarChart
                  data={{
                    labels: stockAnalytics.categoryLabels,
                    datasets: [{ data: stockAnalytics.categoryVolumes }],
                  }}
                  width={SCREEN_WIDTH - 64}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, 
                  }}
                  style={{
                    ...styles.chartCanvas,
                    paddingLeft: 12, 
                  }}
                  verticalLabelRotation={15} 
                />
              </View>
            )}

            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.subText }]}>
                {t.categoryBreakdownTitle}
              </Text>
              {stockAnalytics.allCategoriesBreakdown.map(([catName, qty], idx) => (
                <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <Text style={{ color: theme.text, fontWeight: '600', flex: 2 }}>
                    {getLocalizedCategory(catName)}
                  </Text>
                  <Text style={{ color: theme.primary, fontWeight: '700', flex: 1, textAlign: 'right' }}>
                    {qty} {qty === 1 ? ((t as any).unitLabelSingular || 'Unit') : t.unitsLabel}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Empty State Tracker Wrapper */}
        {((chartView === 'Stock' && !stockAnalytics) || (chartView !== 'Stock' && !orderAnalytics)) && (
          <View style={styles.centerContainer}>
            <Text style={{ color: theme.subText, marginTop: 40, textAlign: 'center' }}>
              {t.noOrdersFound}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}