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
  COMPLETED: '#10b981',
  RETURNED: '#059669',
  IN_PROGRESS: '#0ea5e9',
  FAILED: '#ef4444',
  CANCELLED: '#6b7280',
  CANCEL_PENDING: '#f43f5e',
  REJECTED: '#f97316',
};

interface MongoOid { $oid: string; }
interface MongoDate { $date: string; }

interface MobileOrder {
  _id: MongoOid | string;
  totalAmount: number;
  status: string;
  createdAt: MongoDate | string;
}

interface Booking {
  _id: string;
  storeId: string;
  userId: string;
  bookingType: 'SERVICE' | 'RENTAL';
  item: {
    itemId: string;
    itemName: string;
    description?: string;
    images?: string[];
    category: string;
    unit: string;
    price: number;
    quantity: number;
  };
  startDate: string;
  endDate?: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

interface Product {
  _id: MongoOid | string;
  storeId: MongoOid | string;
  name: string;
  description: string;
  images: string[];
  quantity: number;
  price: string | number;
  category: string;
  createdAt: MongoDate | string;
  updatedAt: MongoDate | string;
}

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

  const [categoryType, setCategoryType] = useState<'ORDERS' | 'RENTALS' | 'SERVICES' | 'STOCK'>('ORDERS');
  const [chartView, setChartView] = useState<'daily' | 'monthly'>('daily');

  // Query 0A: Profile Context
  const { data: userData } = useQuery<UserProfile>({
    queryKey: ['currentUserProfileAnalyticsContext'],
    queryFn: async () => {
      const authToken = await getToken();
      const res = await fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${authToken}` } });
      return res.json();
    },
  });

  // Query 0B: Commission Rate
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

  // Query 1: Orders
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
  });

  // Query 2: Bookings (Rentals & Services)
  const { 
    data: bookings = [], 
    isLoading: isBookingsLoading, 
    isRefetching: isBookingsRefetching, 
    refetch: refetchBookings 
  } = useQuery<Booking[]>({
    queryKey: ['storeBookingsAnalytics'],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/bookings/store/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Query 3: Stock / Products
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
  });

  const handleRefresh = async () => {
    if (categoryType === 'STOCK') {
      await refetchProducts();
    } else if (categoryType === 'ORDERS') {
      await refetchOrders();
    } else {
      await refetchBookings();
    }
  };

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
    propsForLabels: {
      fontSize: 10,
    },
  };

  // Active Items Dataset based on Category selection
  const activeAnalytics = useMemo(() => {
    if (categoryType === 'STOCK') return null;

    let itemsList: Array<{ totalAmount: number; status: string; createdAt: string }> = [];

    if (categoryType === 'ORDERS') {
      itemsList = orders.map(o => ({
        totalAmount: Number(o.totalAmount) || 0,
        status: o.status,
        createdAt: (typeof o.createdAt === 'object' && o.createdAt ? (o.createdAt as any).$date : o.createdAt) || '',
      }));
    } else if (categoryType === 'RENTALS') {
      itemsList = bookings
        .filter(b => b.bookingType === 'RENTAL')
        .map(b => ({
          totalAmount: Number(b.totalAmount) || 0,
          status: b.status,
          createdAt: b.createdAt || b.startDate || '',
        }));
    } else if (categoryType === 'SERVICES') {
      itemsList = bookings
        .filter(b => b.bookingType === 'SERVICE')
        .map(b => ({
          totalAmount: Number(b.totalAmount) || 0,
          status: b.status,
          createdAt: b.createdAt || b.startDate || '',
        }));
    }

    let totalRevenue = 0;
    let completedRevenue = 0; 
    let activePeriodCount = 0;
    const statusMap: Record<string, number> = {};
    const timelineMap: Record<string, { revenue: number; counts: number }> = {};

    const now = new Date();
    const currentDayStr = now.toISOString().slice(5, 10);
    const currentMonthStr = now.toISOString().slice(0, 7);

    for (const item of itemsList) {
      if (!item.createdAt) continue;
      const dateObj = new Date(item.createdAt);
      if (isNaN(dateObj.getTime())) continue;

      const dayKey = dateObj.toISOString().slice(5, 10);
      const monthKey = dateObj.toISOString().slice(0, 7);
      const activeTimelineKey = chartView === 'daily' ? dayKey : monthKey;

      if (!timelineMap[activeTimelineKey]) timelineMap[activeTimelineKey] = { revenue: 0, counts: 0 };
      timelineMap[activeTimelineKey].revenue += item.totalAmount;
      timelineMap[activeTimelineKey].counts += 1;

      const isMatch = chartView === 'daily' 
        ? dayKey === currentDayStr 
        : monthKey === currentMonthStr;

      if (isMatch) {
        totalRevenue += item.totalAmount;
        activePeriodCount++;
        statusMap[item.status] = (statusMap[item.status] ?? 0) + 1;

        if (['DELIVERED', 'COMPLETED', 'RETURNED'].includes(item.status)) {
          completedRevenue += item.totalAmount;
        }
      }
    }

    const sortedTimeline = Object.keys(timelineMap).sort().map(key => ({ label: key, ...timelineMap[key] }));
    const limitedTimeline = sortedTimeline.slice(-6);
    const peakWindow = sortedTimeline.reduce((max, curr) => (curr.revenue > max.revenue ? curr : max), sortedTimeline[0] || { label: 'N/A', revenue: 0 });

    const rate = commission?.percentage || 0;
    const platformFee = (completedRevenue * rate) / 100; 
    const netStoreKeeperEarnings = completedRevenue - platformFee;

    return {
      totalRevenue,
      completedRevenue,
      platformFee,
      netStoreKeeperEarnings,
      activePeriodCount,
      totalItemsCount: itemsList.length,
      avgValue: activePeriodCount > 0 ? totalRevenue / activePeriodCount : 0,
      statusMap,
      sortedTimeline,
      peakWindow,
      chartLabels: limitedTimeline.map(i => i.label),
      chartRevenues: limitedTimeline.map(i => i.revenue),
      chartCounts: limitedTimeline.map(i => i.counts),
    };
  }, [categoryType, orders, bookings, chartView, commission]);

  // Stock Analytics
  const stockAnalytics = useMemo(() => {
    if (!products.length || categoryType !== 'STOCK') return null;

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
  }, [products, categoryType]);

  const isDataLoading = isOrdersLoading || isBookingsLoading || isCommissionLoading;

  if (isDataLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Category Segment Selector: Orders | Rentals | Services | Stock */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={{
              paddingVertical: 7,
              paddingHorizontal: 14,
              borderRadius: 20,
              backgroundColor: categoryType === 'ORDERS' ? theme.primary : (isDark ? '#27272a' : '#f4f4f5'),
            }}
            onPress={() => setCategoryType('ORDERS')}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: categoryType === 'ORDERS' ? '#FFF' : theme.text }}>
              📦 Orders ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingVertical: 7,
              paddingHorizontal: 14,
              borderRadius: 20,
              backgroundColor: categoryType === 'RENTALS' ? theme.primary : (isDark ? '#27272a' : '#f4f4f5'),
            }}
            onPress={() => setCategoryType('RENTALS')}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: categoryType === 'RENTALS' ? '#FFF' : theme.text }}>
              🚜 Rentals ({bookings.filter(b => b.bookingType === 'RENTAL').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingVertical: 7,
              paddingHorizontal: 14,
              borderRadius: 20,
              backgroundColor: categoryType === 'SERVICES' ? theme.primary : (isDark ? '#27272a' : '#f4f4f5'),
            }}
            onPress={() => setCategoryType('SERVICES')}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: categoryType === 'SERVICES' ? '#FFF' : theme.text }}>
              🛠️ Services ({bookings.filter(b => b.bookingType === 'SERVICE').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingVertical: 7,
              paddingHorizontal: 14,
              borderRadius: 20,
              backgroundColor: categoryType === 'STOCK' ? theme.primary : (isDark ? '#27272a' : '#f4f4f5'),
            }}
            onPress={() => setCategoryType('STOCK')}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: categoryType === 'STOCK' ? '#FFF' : theme.text }}>
              📊 Stock
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Daily / Monthly Timeframe Toggle View (for Non-Stock views) */}
      {categoryType !== 'STOCK' && (
        <View style={[styles.toggleContainer, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 1 }]}>
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
        </View>
      )}

      {/* Main Data Layout Stream Area */}
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isOrdersRefetching || isBookingsRefetching || isProductsRefetching}
            onRefresh={handleRefresh}
            colors={[theme.primary]}            
            tintColor={theme.primary}           
            progressBackgroundColor={theme.card} 
          />
        }
      >
        {/* ORDERS / RENTALS / SERVICES VIEW */}
        {categoryType !== 'STOCK' && activeAnalytics && (
          <>
            {/* APP COMMISSION EARNINGS PANEL */}
            <View style={[styles.sectionCard, { backgroundColor: theme.card, borderLeftWidth: 5, borderLeftColor: '#10b981' }]}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12, fontSize: 16 }]}>
                {language === 'ml' ? 'ആപ്പ് കമ്മീഷൻ വരുമാനം' : 'APP COMMISSION EARNINGS'}
              </Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: theme.subText }}>App Commission Rate</Text>
                <Text style={{ color: theme.text, fontWeight: '700' }}>{commission?.percentage || 0}%</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: theme.subText }}>
                  Total {categoryType === 'ORDERS' ? 'Sales' : categoryType === 'RENTALS' ? 'Rental' : 'Service'} Volume
                </Text>
                <Text style={{ color: theme.text, fontWeight: '600' }}>₹{activeAnalytics.completedRevenue.toLocaleString('en-IN')}</Text>
              </View>

              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 8 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>Total Platform Fee</Text>
                <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 20 }}>
                  ₹{Math.round(activeAnalytics.platformFee).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* KPI Cards Row 1 */}
            <View style={styles.gridRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>{t.totalRevenue}</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {activeAnalytics.activePeriodCount}
                </Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>
                  {categoryType === 'ORDERS' ? t.avgOrderValue : 'AVG VALUE'}
                </Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  ₹{Math.round(activeAnalytics.avgValue).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* KPI Cards Row 2 */}
            <View style={styles.gridRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>
                  TOTAL {categoryType === 'ORDERS' ? 'ORDERS' : categoryType === 'RENTALS' ? 'RENTALS' : 'SERVICES'}
                </Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{activeAnalytics.totalItemsCount}</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>{t.peakPerformance}</Text>
                <Text style={[styles.metricValue, { color: theme.text, fontSize: 15 }]} numberOfLines={1}>
                  {activeAnalytics.peakWindow.label} (₹{activeAnalytics.peakWindow.revenue})
                </Text>
              </View>
            </View>

            {/* Total Revenue Timeline LineChart */}
            {activeAnalytics.chartLabels.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.card, paddingRight: 24 }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.revenueTimelineTitle}</Text>
                <LineChart
                  data={{
                    labels: activeAnalytics.chartLabels,
                    datasets: [{ data: activeAnalytics.chartRevenues }],
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

            {/* Counts BarChart */}
            {activeAnalytics.chartLabels.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.card, paddingRight: 24 }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {categoryType === 'ORDERS' ? t.ordersTrackerTitle : 'ACTIVITY VOLUME TRACKER'}
                </Text>
                <BarChart
                  data={{
                    labels: activeAnalytics.chartLabels,
                    datasets: [{ data: activeAnalytics.chartCounts }],
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

            {/* Breakdown Timeline Table */}
            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.subText }]}>
                {t.revenueTimelineBreakdown}
              </Text>
              {activeAnalytics.sortedTimeline.map((item, idx) => (
                <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{item.label}</Text>
                  <Text style={{ color: theme.subText }}>
                    {item.counts} {categoryType === 'ORDERS' ? 'Orders' : 'Bookings'}
                  </Text>
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>₹{item.revenue}</Text>
                </View>
              ))}
            </View>

            {/* Status Breakdown */}
            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.subText }]}>STATUS ALLOCATION</Text>
              {Object.entries(activeAnalytics.statusMap).map(([statusName, count], idx) => {
                const total = activeAnalytics.totalItemsCount || 1;
                const allocationPercentage = ((count / total) * 100).toFixed(0);
                const statusColor = STATUS_COLORS[statusName] ?? '#9ca3af';

                return (
                  <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor }} />
                      <Text style={{ color: theme.text, fontWeight: '600' }}>{statusName}</Text>
                    </View>
                    <Text style={{ color: theme.subText }}>{count} ({allocationPercentage}%)</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* STOCK / INVENTORY VIEW */}
        {categoryType === 'STOCK' && stockAnalytics && (
          <>
            <View style={styles.gridRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>UNIQUE PRODUCTS</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{stockAnalytics.totalUniqueProducts}</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metricLabel, { color: theme.subText }]}>TOTAL INVENTORY</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{stockAnalytics.totalItemsStocked}</Text>
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>LOW STOCK ALERTS (≤ 5 Units)</Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: stockAnalytics.lowStockCount > 0 ? '#ef4444' : '#10b981', marginTop: 4 }}>
                {stockAnalytics.lowStockCount} Items
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.subText }]}>CATEGORY STOCK BREAKDOWN</Text>
              {stockAnalytics.allCategoriesBreakdown.map(([cat, qty], idx) => (
                <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{cat}</Text>
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>{qty} units</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
