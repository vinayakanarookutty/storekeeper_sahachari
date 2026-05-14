import { Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  floatingHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },

  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 0,
  },

  imageSection: {
    position: 'relative',
  },

  imageContainer: {
    width: width,
    height: 400,
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 400,
  },

  noImageContainer: {
    width: width,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
  },

  noImageText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },

  offerBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  offerBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  dotsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },

  activeDot: {
    width: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  imageCountBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },

  imageCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  infoCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 30,
    paddingHorizontal: 24,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },

  badgesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },

  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },

  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },

  lowStockBadge: {
    backgroundColor: '#FFEBEE',
  },

  stockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },

  lowStockText: {
    color: '#D32F2F',
  },

  productName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D2416',
    marginBottom: 20,
    lineHeight: 36,
  },

  priceContainer: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  priceRow: {
    marginBottom: 4,
  },

  priceMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },

  currency: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DAA520',
    marginRight: 4,
  },

  priceWithDiscountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },

  originalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    textDecorationLine: 'line-through',
  },

  productPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#DAA520',
  },

  savingsChip: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },

  savingsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  offersSection: {
    marginBottom: 24,
  },

  sectionHeaderRow: {
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2416',
  },

  offerCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  offerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  offerBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },

  offerValueText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  activeDotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
  },

  activeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },

  deleteOfferButton: {
    padding: 8,
  },

  offerDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  offerDates: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },

  descriptionSection: {
    marginBottom: 24,
  },

  productDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 26,
    marginTop: 12,
  },

  statsContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  statBox: {
    flex: 1,
    alignItems: 'center',
  },

  statIconContainer: {
    marginBottom: 12,
  },

  statIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },

  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
  },

  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2416',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },

  bottomSpacing: {
    height: 100,
  },

  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },

  offerButtonWrapper: {
    flex: 1,
  },

  offerButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  iconButtonWrapper: {
    width: 56,
    height: 56,
  },

  iconButton: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: height * 0.85,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D2416',
  },

  inputGroup: {
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2416',
    marginBottom: 10,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },

  inputIcon: {
    marginLeft: 16,
    marginRight: 8,
  },

  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#2D2416',
  },

  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    gap: 12,
  },

  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: '#2D2416',
    fontWeight: '500',
  },

  previewSection: {
    marginTop: 8,
    marginBottom: 20,
  },

  previewLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2416',
    marginBottom: 10,
  },

  previewCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },

  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    marginBottom: 12,
  },

  previewBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  previewPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2416',
    marginBottom: 8,
  },

  previewSavings: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },

  saveButtonWrapper: {
    flex: 1,
  },

  saveButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});