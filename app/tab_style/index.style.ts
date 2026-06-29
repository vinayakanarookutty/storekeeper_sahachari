import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFCF7', // Crisp off-white with a very subtle warm undertone
    alignItems: 'center',
    marginBottom:50
  },

  maxWidthWrapper: {
    width: '100%',
    maxWidth: 1200,
    flex: 1,
  },

  /* =========================
     PREMIUM GRADIENT HEADER (Golden Theme)
  ========================= */
  headerGradient: {
    width: '100%',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderTopLeftRadius:26,
    borderTopRightRadius:26,
    paddingHorizontal: 24,
    paddingBottom: 25,
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    
    // Rich golden glow drop shadow
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },

  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },

  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  headerLineAccent: {
    width: 28,
    height: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
    borderRadius: 2,
    marginRight: 8,
  },

  subtitleText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.95,
  },

  /* =========================
     AVATAR & HEADER ACTIONS
  ========================= */
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },



  avatarImage: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  logoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* =========================
     LANGUAGE TOGGLE BLOCK
  ========================= */
  languageToggleContainer: {
    marginTop: 16,
    alignItems: 'flex-start',
  },

  languageToggle: {
    width: 84,
    height: 32,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },

  toggleSlider: {
    position: 'absolute',
    width: 42,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    left: 0,
    top: 0,
  },

  langButton: {
    width: 42,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },

  langText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
  },

  langTextActive: {
    color: '#DAA520', // Snaps sharply to Golden Yellow when selected
    fontSize: 12,
    fontWeight: '700',
  },

  /* =========================
     FLOATING ACTION BUTTONS
  ========================= */
  actionButtonsContainer: {
  width: '100%',
  paddingTop: 15,
  paddingBottom: 10,
},

  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12, 
  },

  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DAA520', // Vibrant Golden Theme Accent Button
    borderRadius: 16,
    minHeight: 48,
    gap: 3,
    elevation: 4,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  bulkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B', // Deep Charcoal Slate for contrast balance
    borderRadius: 16,
    minHeight: 48,
    gap: 3,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  /* =========================
     PRODUCT GRID LIST
  ========================= */
  list: {
    paddingHorizontal: 16,
    paddingTop: 16, // Smoother breathing room below the action buttons
  },

  columnWrapper: {
    justifyContent: 'space-between',
  },

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    
    ...Platform.select({
      ios: {
        shadowColor: '#2D2416',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        boxShadow: '0px 4px 12px rgba(45, 36, 22, 0.06)',
      },
    }),
  },

  imageWrapper: {
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#F5F5F0',
  },

  offerBadge: {
  position: 'absolute',
  top: 10,
  left: 10,
  backgroundColor: '#E74C3C', // Eye-catching sale red
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 8,
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
    letterSpacing: 0.3,
  },

  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A140B',
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
    color: '#9CA3AF',
    fontSize: 12,
    textDecorationLine: 'line-through',
  },

  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
    paddingTop: 10,
  },

  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  stockText: {
    fontSize: 11,
    color: '#B28216', // Darker golden-olive tint for readable text contrast
    fontWeight: '600',
  },

  /* =========================
     EMPTY / LOADING STATES
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
    borderRadius: 12,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});