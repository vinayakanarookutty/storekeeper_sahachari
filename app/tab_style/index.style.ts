import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFCF0',
    alignItems: 'center',
  },

  maxWidthWrapper: {
    width: '100%',
    maxWidth: 1200,
    flex: 1,
  },

  /* =========================
     HEADER
  ========================= */

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },

  headerTop: {
    marginBottom: 16,
  },

  welcomeText: {
    fontSize: 13,
    color: '#A89378',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A140B',
  },

  /* =========================
     ACTION BUTTONS
  ========================= */

  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#DAA520',

    paddingHorizontal: 14,
    paddingVertical: 10,

    borderRadius: 12,

    minHeight: 44,

    flexShrink: 1,

    gap: 6,

    elevation: 4,

    shadowColor: '#DAA520',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },

  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#444',

    paddingHorizontal: 14,
    paddingVertical: 10,

    borderRadius: 12,

    minHeight: 44,

    flexShrink: 1,

    gap: 6,

    elevation: 2,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* =========================
     PRODUCT LIST
  ========================= */

  list: {
    padding: 16,
    paddingBottom: 100,
  },

  columnWrapper: {
    justifyContent: 'flex-start',
    gap: 16,
  },

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',

    borderWidth: 1.5,
    borderColor: '#E0D6C3',

    ...Platform.select({
      ios: {
        shadowColor: '#2D2416',
        shadowOffset: {
          width: 0,
          height: 6,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },

      android: {
        elevation: 4,
      },

      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        boxShadow: '0px 4px 12px rgba(45, 36, 22, 0.08)',
      },
    }),
  },

  imageWrapper: {
    backgroundColor: '#F9F9F9',
    position: 'relative',
    overflow: 'hidden',
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  noImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },

  offerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },

  offerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  productInfo: {
    padding: 14,
  },

  categoryText: {
    fontSize: 10,
    color: '#A89378',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D2416',
    marginBottom: 6,
  },

  priceRow: {
    marginBottom: 10,
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  priceText: {
    color: '#1A140B',
    fontSize: 16,
    fontWeight: '800',
  },

  discountedPrice: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: '800',
  },

  originalPriceText: {
    color: '#999',
    fontSize: 12,
    textDecorationLine: 'line-through',
  },

  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 10,
  },

  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  stockText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '600',
  },

  /* =========================
     EMPTY / LOADING
  ========================= */

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  emptyText: {
    fontSize: 18,
    color: '#2D2416',
    marginTop: 20,
    fontWeight: '700',
  },

  emptyButton: {
    marginTop: 20,
    backgroundColor: '#DAA520',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  titleRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

languageToggle: {
  width: 88,
  height: 36,
  flexDirection: 'row',
  backgroundColor: '#EFE7D3',
  borderRadius: 18,
  position: 'relative',
  overflow: 'hidden',
},

toggleSlider: {
  position: 'absolute',
  width: 44,
  height: 36,
  backgroundColor: '#DAA520',
  borderRadius: 18,
  left: 0,
  top: 0,
},

langButton: {
  width: 44,
  height: 36,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 2,
},

langText: {
  color: '#666',
  fontSize: 14,
  fontWeight: '600',
},

langTextActive: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '700',
},

languageToggleContainer: {
  marginTop: 12,
  alignItems: 'flex-start',
},
});