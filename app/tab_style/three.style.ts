import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  orderCard: {
    marginHorizontal: 4,
    marginBottom: 24,
    borderRadius: 24,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
    overflow: 'hidden',
  },
  orderCardGradient: {
    padding: 20,
    borderRadius: 24,
  },
  // HEADER STYLES
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  orderIdLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#AAA',
    fontWeight: '800',
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  // CUSTOMER CARD
  customerCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DAA520',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  customerNameMain: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  expandedDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  // PROGRESS TRACKER
  progressContainer: {
    flexDirection: 'row',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  progressLine: {
    height: 2,
    width: '100%',
    position: 'absolute',
    top: 9,
    left: '-50%',
  },
  progressDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  progressText: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 6,
    textTransform: 'capitalize',
  },
  // ITEM ROW
  itemRowImproved: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemImageWrapper: {
    position: 'relative',
  },
  itemImageSmall: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#EEE',
  },
  qtyBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  qtyText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  itemNameSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  itemCatSmall: {
    fontSize: 12,
    color: '#888',
  },
  itemPriceSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  // TOTALS & ACTIONS
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  actionsContainer: {
    flexDirection: 'row', 
    gap: 10, 
    marginTop: 20 
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});