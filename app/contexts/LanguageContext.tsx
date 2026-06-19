// D:\storekeeper_sahachari\app\contexts\LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'ml';

const STORAGE_KEY = 'sahachari_user_language';

const translations = {
  en: {
    // Auth / Login Screen Keys
    welcomeBack: 'Welcome Back',
    loginSubtitle: 'Log in to your account',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    logInLabel: 'Log In',
    forgotPasswordLabel: 'Forgot Password?',
    fillFieldsMsg: 'Please fill in all fields',
    errorTitle: 'Error',

    // Home
    sahachari: 'Sahachari',
    myStore: 'My Store', 
    inStock: 'in stock',
    addProduct: 'Add Product',
    noProducts: 'No products listed',
    createFirstProduct: 'Create your first product',
    bulkUpload: 'Bulk Upload',

    // Bulk Upload Specific Fields
    bulkUploadSubtitle: 'Upload Excel or CSV files to import products quickly',
    tapToChooseFile: 'Tap to choose file',
    supportsExtensions: 'Supports .xlsx and .csv',
    importProductsBtn: 'Import Products',

    // Orders (Base keys)
    all: 'ALL',
    placed: 'PLACED',
    ready: 'READY',
    accepted: 'ACCEPTED',
    delivered: 'DELIVERED',
    rejected: 'REJECTED',
    noOrdersFound: 'No orders found',
    grandTotal: 'Grand Total',
    accept: 'ACCEPT',
    markReady: 'MARK READY',
    completeDeliver: 'COMPLETE / DELIVER',
    reject: 'REJECT',
    cancel: 'Cancel',
    cancelRequestedLabel: 'Cancel Requested',
    cancelRequestedShort: 'CANCEL Req.',

    // Orders (New keys required by three.tsx conversion)
    statusPlaced: 'Order Placed',
    statusReady: 'Ready',
    statusAccepted: 'Accepted',
    statusPickedUp: 'Picked Up',
    statusCompleted: 'Completed',
    statusRejected: 'REJECTED',
    statusCancelled: 'CANCELLED',
    statusCancelPending: 'Cancel Pending',
    successTitle: 'Success',
    statusUpdatedSuccess: 'Order status updated',
    failedTitle: 'Action Failed',
    confirmTitle: 'Confirm',
    confirmAcceptOrder: 'Do you want to Accept this order?',
    confirmMarkReady: 'Do you want to Mark this order Ready?',
    confirmRejectOrder: 'Do you want to Reject this Order?',
    confirmCompleteOrder: 'Do you want to Complete this Order?',
    refLabel: 'REF',
    unknownUser: 'Unknown',
    selfPickupBadge: 'SELF PICKUP ORDER',
    qtyLabel: 'Qty',

    // Profile
    contactInformation: 'Contact Information',
    mobileNumber: 'Mobile Number',
    primaryAddress: 'Primary Address',
    secondaryAddress: 'Secondary Address',
    servicePincodes: 'Service Pincodes',
    logout: 'Log Out',

    // Analytics
    daily: 'Daily',
    monthly: 'Monthly',
    stock: 'Stock',
    totalRevenue: 'Total Revenue',
    totalOrders: 'Total Orders',
    statusFailed: 'FAILED',
    failed: 'Failed',

    // Analytics Additions (Fixes Mix-up)
    uniqueProducts: 'Unique Products',
    totalStock: 'Total Stock',
    lowStockAlerts: 'Low Stock Alerts (≤5)',
    itemsLabel: 'Items',
    topStockCategories: 'Top Stock Categories',
    categoryBreakdownTitle: 'SAHACHARI CATEGORY BREAKDOWN',
    unitsLabel: 'Units',
    unitLabelSingular: 'Unit',
    avgOrderValue: 'Avg Order Value',
    peakPerformance: 'Peak Performance',
    revenueTimelineTitle: 'Total Revenue Timeline (₹)',
    ordersTrackerTitle: 'Total Orders Tracker',
    revenueTimelineBreakdown: 'TOTAL REVENUE TIMELINE BREAKDOWN',
    orderStatusAllocation: 'ORDER STATUS ALLOCATION',
    ordersLabel: 'Orders',
    orderLabelSingular: 'Order', // Added singular variant

    // Navigation Tabs
    homeTab: 'Home',
    ordersTab: 'Orders',
    analyticsTab: 'Analytics',
    profileTab: 'Profile',

    // Add/Edit Product & General
    addNewProduct: 'Add New Product',
    addNewService: 'Add New Service',
    editProduct: 'Edit Product',
    editService: 'Edit Service',
    selectCategory: 'Select Category',
    productName: 'Product Name',
    serviceName: 'Service Name',
    description: 'Description',
    price: 'Price',
    stockQty: 'Stock',
    images: 'Images',
    pickImages: 'Pick Images',
    manageImages: 'Manage Images',
    addNewImages: 'Add New Images',
    uploadSelection: 'Upload Selection',
    upload: 'Upload',
    createProductBtn: 'Create Product',
    createServiceBtn: 'Create Service',
    delete: 'Delete',
    ok: 'OK',
    selectUnit: 'Select Unit',

    // Product Categories
    food: 'Food',
    beverages: 'Beverages',
    service: 'Service',
    'home made': 'Home Made',
    'vegetables and fruits': 'Vegetables and Fruits',
    'fast food': 'Fast Food',
    snacks: 'Snacks',
    groceries: 'Groceries',
    'fish & meat': 'Fish & Meat',
    rent: 'Rent',

    // Product Detail Core Labels
    productNotFound: 'Product not found',
    noImages: 'No images available',
    offLabel: 'OFF',
    saveLabel: 'Save Changes',
    perUnit: 'per unit',
    activeOffers: 'Active Offers',
    statusActive: 'Active',
    servicePriceLabel: 'Service Price',
    totalValueLabel: 'Total Value',
    unitsAvailable: 'Units Available',
    addOffer: 'Add Offer',

    // Add Offer Modal Form Fields
    addNewOfferTitle: 'Add New Offer',
    discountPercentageLabel: 'Discount Percentage',
    discountPlaceholder: 'Enter discount (e.g., 10)',
    startDateLabel: 'Start Date',
    endDateLabel: 'End Date',
    previewLabel: 'Preview',
    previewSavingsPrefix: 'You save',
    previewSavingsSuffix: 'per unit',
    addingState: 'Adding...',

    // Product & Offer Mutation Management
    failedAddOffer: 'Failed to add offer',
    offerAddedSuccess: 'Offer added successfully!',
    failedDeleteOffer: 'Failed to delete offer',
    offerDeletedSuccess: 'Offer deleted successfully!',
    failedDeleteService: 'Failed to delete service',
    failedDeleteProduct: 'Failed to delete product',
    serviceDeletedSuccess: 'Service deleted successfully!',
    productDeletedSuccess: 'Product deleted successfully!',
    
    // Deletion Alerts & Confirms
    deleteServiceTitle: 'Delete Service',
    deleteProductTitle: 'Delete Product',
    deleteServiceConfirm: 'Are you sure you want to delete this service? This action cannot be undone.',
    deleteProductConfirm: 'Are you sure you want to delete this product? This action cannot be undone.',
    deleteOfferTitle: 'Delete Offer',
    deleteOfferConfirm: 'Are you sure you want to delete this offer?',

    // Input Validation Alerts
    invalidOfferValueError: 'Please enter a valid offer value',
    offerExceedLimitError: 'Discount cannot exceed 100%',
    dateOrderError: 'End date must be after start date',

    // Measurement Units Localization
    units: {
      'kg': 'kg',
      'grams': 'grams',
      'liters': 'liters',
      'ml': 'ml',
      'pcs': 'pcs',
      'packet': 'packet',
      'box': 'box',
      'hour': 'Hour',
      'day': 'Day',
      'week': 'Week',
      'month': 'Month',
      'service': 'Service'
    }
  },
  ml: {
    // Auth / Login Screen Keys
    welcomeBack: 'വീണ്ടും സ്വാഗതം',
    loginSubtitle: 'നിങ്ങളുടെ അക്കൗണ്ടിലേക്ക് ലോഗിൻ ചെയ്യുക',
    emailPlaceholder: 'ഇമെയിൽ',
    passwordPlaceholder: 'പാസ്‌വേഡ്',
    logInLabel: 'ലോഗിൻ ചെയ്യുക',
    forgotPasswordLabel: 'പാസ്‌വേഡ് മറന്നുപോയോ?',
    fillFieldsMsg: 'ദയവായി എല്ലാ ഫീൽഡുകളും പൂരിപ്പിക്കുക',
    errorTitle: 'എറർ',

    // Home
    sahachari: 'സഹചാരി',
    myStore: 'എൻ്റെ സ്റ്റോർ', 
    inStock: 'സ്റ്റോക്കിൽ',
    addProduct: 'ഉൽപ്പന്നം ചേർക്കുക',
    noProducts: 'ഉൽപ്പന്നങ്ങൾ ലഭ്യമല്ല',
    createFirstProduct: 'ആദ്യ ഉൽപ്പന്നം സൃഷ്ടിക്കുക',
    bulkUpload: 'ബൾക്ക് അപ്‌ലോഡ്',

    // Bulk Upload Specific Fields
    bulkUploadSubtitle: 'ഉൽപ്പന്നങ്ങൾ വേഗത്തിൽ ചേർക്കാൻ Excel അല്ലെങ്കിൽ CSV ഫയലുകൾ അപ്‌ലോഡ് ചെയ്യുക',
    tapToChooseFile: 'ഫയൽ തിരഞ്ഞെടുക്കാൻ ടാപ്പ് ചെയ്യുക',
    supportsExtensions: '.xlsx, .csv എന്നിവ സപ്പോർട്ട് ചെയ്യുന്നു',
    importProductsBtn: 'ഉൽപ്പന്നങ്ങൾ ചേർക്കുക',

    // Orders (Base keys)
    all: 'എല്ലാം',
    placed: 'ലഭിച്ചവ',
    ready: 'തയ്യാറായവ',
    accepted: 'സ്വീകരിച്ചവ',
    delivered: 'ഡെലിവർ ചെയ്തവ',
    rejected: 'നിരസിച്ചവ',
    noOrdersFound: 'ഓർഡറുകൾ ഒന്നും കണ്ടെത്തിയില്ല',
    grandTotal: 'ആകെ തുക',
    accept: 'സ്വീകരിക്കുക',
    markReady: 'ഓർഡർ തയ്യാർ',
    completeDeliver: 'പൂർത്തിയാക്കുക / ഡെലിവർ ചെയ്യുക',
    reject: 'നിരസിക്കുക',
    cancel: 'റദ്ദാക്കുക',
    cancelRequestedLabel: 'റദ്ദാക്കാൻ അഭ്യർത്ഥിച്ചവ',
    cancelRequestedShort: 'റദ്ദാക്കൽ അപേ.',

    // Orders (New keys)
    statusPlaced: 'ഓർഡർ ലഭിച്ചു',
    statusReady: 'തയ്യാറായി',
    statusAccepted: 'സ്വീകരിച്ചു',
    statusPickedUp: 'എടുത്തു',
    statusCompleted: 'പൂർത്തിയായി',
    statusRejected: 'നിരസിച്ചു',
    statusCancelled: 'റദ്ദാക്കി',
    statusCancelPending: 'റദ്ദാക്കാൻ അഭ്യർത്ഥിച്ചവ',
    successTitle: 'വിജയം',
    statusUpdatedSuccess: 'ഓർഡർ സ്റ്റാറ്റസ് പുതുക്കിയിരിക്കുന്നു',
    failedTitle: 'നടപടി പരാജയപ്പെട്ടു',
    confirmTitle: 'ഉറപ്പാക്കുക',
    confirmAcceptOrder: 'ഈ ഓർഡർ സ്വീകരിക്കാൻ നിങ്ങൾക്ക് ഉറപ്പാണോ?',
    confirmMarkReady: 'ഈ ഓർഡർ തയ്യാറായതായി അടയാളപ്പെടുത്താൻ നിങ്ങൾക്ക് ഉറപ്പാണോ?',
    confirmRejectOrder: 'ഈ ഓർഡർ നിരസിക്കാൻ നിങ്ങൾക്ക് ഉറപ്പാണോ?',
    confirmCompleteOrder: 'ഈ ഓർഡർ പൂർത്തിയാക്കാൻ നിങ്ങൾക്ക് ഉറപ്പാണോ?',
    refLabel: 'REF',
    unknownUser: 'അജ്ഞാതൻ',
    selfPickupBadge: 'സ്വയം വന്ന് എടുക്കുന്ന ഓർഡർ',
    qtyLabel: 'അളവ്',

    // Profile
    contactInformation: 'ബന്ധപ്പെടേണ്ട വിവരങ്ങൾ',
    mobileNumber: 'മൊബൈൽ നമ്പർ',
    primaryAddress: 'പ്രധാന വിലാസം',
    secondaryAddress: 'രണ്ടാം വിലാസം',
    servicePincodes: 'സർവീസ് പിൻകോഡുകൾ',
    logout: 'ലോഗ് ഔട്ട്',

    // Analytics
    daily: 'ദിനംപ്രതി',
    monthly: 'മാസംതോറും',
    stock: 'സ്റ്റോക്ക്',
    totalRevenue: 'ആകെ വരുമാനം',
    totalOrders: 'ആകെ ഓർഡറുകൾ',
    statusFailed: 'പരാജയപ്പെട്ടു',
    failed: 'പരാജയപ്പെട്ടു',

    // Analytics Additions (Fixes Mix-up)
    uniqueProducts: 'ആകെ ഉൽപ്പന്നങ്ങൾ',
    totalStock: 'ആകെ സ്റ്റോക്ക്',
    lowStockAlerts: 'കുറഞ്ഞ സ്റ്റോക്ക് മുന്നറിയിപ്പുകൾ (≤5)',
    itemsLabel: 'ഇനങ്ങൾ',
    topStockCategories: 'കൂടുതൽ സ്റ്റോക്കുള്ള വിഭാഗങ്ങൾ',
    categoryBreakdownTitle: 'സഹചാരി കാറ്റഗറി തിരിച്ചുള്ള വിവരങ്ങൾ',
    unitsLabel: 'യൂണിറ്റുകൾ',
    unitLabelSingular: 'യൂണിറ്റ്',
    avgOrderValue: 'ശരാശരി ഓർഡർ മൂല്യം',
    peakPerformance: 'മികച്ച പ്രകടനം',
    revenueTimelineTitle: 'ആകെ വരുമാന സമയരേഖ (₹)',
    ordersTrackerTitle: 'ആകെ ഓർഡറുകളുടെ ട്രാക്കർ',
    revenueTimelineBreakdown: 'ആകെ വരുമാനത്തിന്റെ സമയരേഖാ വിവരണം',
    orderStatusAllocation: 'ഓർഡർ സ്റ്റാറ്റസ് വിഭജനം',
    ordersLabel: 'ഓർഡറുകൾ',
    orderLabelSingular: 'ഓർഡർ', // Added singular variant

    // Navigation Tabs
    homeTab: 'ഹോം',
    ordersTab: 'ഓർഡറുകൾ',
    analyticsTab: 'അനലിറ്റിക്സ്',
    profileTab: 'പ്രൊഫൈൽ',

    // Add/Edit Product & General
    addNewProduct: 'പുതിയ ഉൽപ്പന്നം ചേർക്കുക',
    addNewService: 'പുതിയ സേവനം ചേർക്കുക',
    editProduct: 'ഉൽപ്പന്നം എഡിറ്റ് ചെയ്യുക',
    editService: 'സേവനം എഡിറ്റ് ചെയ്യുക',
    selectCategory: 'വിഭാഗം തിരഞ്ഞെടുക്കുക',
    productName: 'ഉൽപ്പന്നത്തിന്റെ പേര്',
    serviceName: 'സേവനത്തിന്റെ പേര്',
    description: 'വിവരണം',
    price: 'വില',
    stockQty: 'സ്റ്റോക്ക്',
    images: 'ചിത്രങ്ങൾ',
    pickImages: 'ചിത്രങ്ങൾ തിരഞ്ഞെടുക്കുക',
    manageImages: 'ചിത്രങ്ങൾ കൈകാര്യം ചെയ്യുക',
    addNewImages: 'പുതിയ ചിത്രങ്ങൾ ചേർക്കുക',
    uploadSelection: 'തിരഞ്ഞെടുത്തവ അപ്‌ലോഡ് ചെയ്യുക',
    upload: 'അപ്‌ലോഡ്',
    createProductBtn: 'ഉൽപ്പന്നം സൃഷ്ടിക്കുക',
    createServiceBtn: 'സേവനം സൃഷ്ടിക്കുക',
    delete: 'ഡിലീറ്റ്',
    ok: 'ശരി',
    selectUnit: 'യൂണിറ്റ് തിരഞ്ഞെടുക്കുക',

    // Product Categories
    food: 'ഭക്ഷണം',
    beverages: 'പാനീയങ്ങൾ',
    service: 'സേവനം',
    'home made': 'ഹോം മെയ്ഡ്',
    'vegetables and fruits': 'പച്ചക്കക്കറികളും പഴങ്ങളും',
    'fast food': 'ഫാസ്റ്റ് ഫുഡ്',
    snacks: 'സ്നാക്ക്സ്',
    groceries: 'ഗ്രോസറി',
    'fish & meat': 'മത്സ്യവും ഇറച്ചിയും',
    rent: 'വാടകയ്ക്ക്',

    // Product Detail Core Labels
    productNotFound: 'ഉൽപ്പന്നം കണ്ടെത്താനായില്ല',
    noImages: 'ചിത്രങ്ങൾ ലഭ്യമല്ല',
    offLabel: 'കിഴിവ്',
    saveLabel: 'മാറ്റങ്ങൾ സംരക്ഷിക്കുക',
    perUnit: 'ഓരോ യൂണിറ്റിനും',
    activeOffers: 'നിലവിലുള്ള ഓഫറുകൾ',
    statusActive: 'സജീവം',
    servicePriceLabel: 'സേവന നിരക്ക്',
    totalValueLabel: 'ആകെ മൂല്യം',
    unitsAvailable: 'ലഭ്യമായ യൂണിറ്റുകൾ',
    addOffer: 'ഓഫറുകൾ ചേർക്കുക',

    // Add Offer Modal Form Fields
    addNewOfferTitle: 'പുതിയ ഓഫർ ചേർക്കുക',
    discountPercentageLabel: 'ഡിസ്കൗണ്ട് ശതമാനം',
    discountPlaceholder: 'ഡിസ്കൗണ്ട് നൽകുക (ഉദാ: 10)',
    startDateLabel: 'ആരംഭ തീയതി',
    endDateLabel: 'അവസാന തീയതി',
    previewLabel: 'പ്രിവ്യൂ',
    previewSavingsPrefix: 'നിങ്ങൾക്ക് ലാഭിക്കാം',
    previewSavingsSuffix: 'ഓരോ യൂണിറ്റിനും',
    addingState: 'ചേർക്കുന്നു...',

    // Product & Offer Mutation Management
    failedAddOffer: 'ഓഫർ ചേർക്കാൻ സാധിച്ചില്ല',
    offerAddedSuccess: 'ഓഫർ വിജയകരമായി ചേർത്തു!',
    failedDeleteOffer: 'ഓഫർ നീക്കം ചെയ്യാൻ സാധിച്ചില്ല',
    offerDeletedSuccess: 'ഓഫർ വിജയകരമായി നീക്കം ചെയ്തു!',
    failedDeleteService: 'സേവനം നീക്കം ചെയ്യാൻ സാധിച്ചില്ല',
    failedDeleteProduct: 'ഉൽപ്പന്നം നീക്കം ചെയ്യാൻ സാധിച്ചില്ല',
    serviceDeletedSuccess: 'സേവനം വിജയകരമായി നീക്കം ചെയ്തു!',
    productDeletedSuccess: 'ഉൽപ്പന്നം വിജയകരമായി നീക്കം ചെയ്തു!',

    // Deletion Alerts & Confirms
    deleteServiceTitle: 'സേവനം നീക്കം ചെയ്യുക',
    deleteProductTitle: 'ഉൽപ്പന്നം നീക്കം ചെയ്യുക',
    deleteServiceConfirm: 'ഈ സേവനം നീക്കം ചെയ്യാൻ നിങ്ങൾക്ക് ഉറപ്പാണോ? ഈ നടപടി പിന്നീട് മാറ്റാനാകില്ല.',
    deleteProductConfirm: 'ഈ ഉൽപ്പന്നം നീക്കം ചെയ്യാൻ നിങ്ങൾക്ക് ഉറപ്പാണോ? ഈ നടപടി പിന്നീട് മാറ്റാനാകില്ല.',
    deleteOfferTitle: 'ഓഫർ നീക്കം ചെയ്യുക',
    deleteOfferConfirm: 'ഈ ഓഫർ നീക്കം ചെയ്യാൻ നിങ്ങൾക്ക് ഉറപ്പാണോ?',

    // Input Validation Alerts
    invalidOfferValueError: 'ദയവായി സാധുവായ ഒരു ഡിസ്കൗണ്ട് നിരക്ക് നൽകുക',
    offerExceedLimitError: 'ഡിസ്കൗണ്ട് നിരക്ക് 100%-ൽ കൂടാൻ പാടില്ല',
    dateOrderError: 'അവസാന തീയതി ആരംഭ തീയതിക്ക് ശേഷമായിരിക്കണം',

    // Measurement Units Localization
    units: {
      'kg': 'കിലോഗ്രാം',
      'grams': 'ഗ്രാം',
      'liters': 'ലിറ്റർ',
      'ml': 'മില്ലിലിറ്റർ',
      'pcs': 'എണ്ണം',
      'packet': 'പാക്കറ്റ്',
      'box': 'പെട്ടി',
      'hour': 'മണിക്കൂർ',
      'day': 'ദിവസം',
      'week': 'ആഴ്ച',
      'month': 'മാസം',
      'service': 'സേവനം'
    }
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language settings automatically on boot execution
  useEffect(() => {
    const loadStoredLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedLang === 'en' || savedLang === 'ml') {
          setLanguageState(savedLang);
        }
      } catch (error) {
        console.error('Failed to load language from async storage:', error);
      }
    };
    loadStoredLanguage();
  }, []);

  // Save changes securely inside local storage layer
  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      console.error('Failed to save language to async storage:', error);
    }
  };

  const value = {
    language,
    setLanguage,
    t: translations[language],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};