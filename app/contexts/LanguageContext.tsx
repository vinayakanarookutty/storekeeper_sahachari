import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'ml';

const translations = {
  en: {
    // Home
    myInventory: 'Sahachari',
    inStock: 'in stock',
    addProduct: 'Add Product',
    noProducts: 'No products listed',
    createFirstProduct: 'Create your first product',
    bulkUpload: 'Bulk Upload',

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
    cancelRequestedShort: 'Cancel Req.',

    // Orders (New keys required by three.tsx conversion)
    statusPlaced: 'Order Placed',
    statusReady: 'Ready',
    statusAccepted: 'Accepted',
    statusPickedUp: 'Picked Up',
    statusCompleted: 'Completed',
    statusRejected: 'Rejected',
    statusCancelled: 'Cancelled', // Unique string for Cancelled
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
    statusFailed: 'Failed',
    failed: 'Failed',

    // Navigation Tabs
    homeTab: 'Home',
    ordersTab: 'Orders',
    analyticsTab: 'Analytics',
    profileTab: 'Profile',

    // Add Product
    addNewProduct: 'Add New Product',
    addNewService: 'Add New Service',
    selectCategory: 'Select Category',
    productName: 'Product Name',
    serviceName: 'Service Name',
    description: 'Description',
    price: 'Price',
    stockQty: 'Stock',
    images: 'Images',
    pickImages: 'Pick Images',
    upload: 'Upload',
    createProductBtn: 'Create Product',
    createServiceBtn: 'Create Service',
  },

  ml: {
    // Home
    myInventory: 'സഹചാരി',
    inStock: 'സ്റ്റോക്കിൽ',
    addProduct: 'ഉൽപ്പന്നം ചേർക്കുക',
    noProducts: 'ഉൽപ്പന്നങ്ങൾ ലഭ്യമല്ല',
    createFirstProduct: 'ആദ്യ ഉൽപ്പന്നം സൃഷ്ടിക്കുക',
    bulkUpload: 'ബൾക്ക് അപ്‌ലോഡ്',

    // Orders (Base keys)
    all: 'എല്ലാം',
    placed: 'ഓർഡർ ചെയ്തു',
    ready: 'തയ്യാർ',
    accepted: 'സ്വീകരിച്ചു',
    delivered: 'ഡെലിവർ ചെയ്തു',
    rejected: 'നിരസിച്ചു',
    noOrdersFound: 'ഓർഡറുകൾ ലഭ്യമല്ല',
    grandTotal: 'ആകെ തുക',
    accept: 'സ്വീകരിക്കുക',
    markReady: 'തയ്യാർ',
    completeDeliver: 'പൂർത്തിയാക്കുക',
    reject: 'നിരസിക്കുക',
    cancel: 'റദ്ദാക്കുക',
    cancelRequestedLabel: 'റദ്ദാക്കാൻ അഭ്യർത്ഥിച്ചു',
    cancelRequestedShort: 'അഭ്യർത്ഥനകൾ',

    // Orders (New keys required by three.tsx conversion)
    statusPlaced: 'ഓർഡർ ലഭിച്ചു',
    statusReady: 'തയ്യാറാണ്',
    statusAccepted: 'സ്വീകരിച്ചു',
    statusPickedUp: 'എടുത്തു',
    statusCompleted: 'പൂർത്തിയായി',
    statusRejected: 'നിരസിച്ചു',
    statusCancelled: 'റദ്ദാക്കി', // Fixed: No longer overlaps with നിരസിച്ചു!
    successTitle: 'വിജയം',
    statusUpdatedSuccess: 'ഓർഡർ നില പുതുക്കി',
    failedTitle: 'നടപടി പരാജയപ്പെട്ടു',
    confirmTitle: 'ഉറപ്പാക്കുക',
    confirmAcceptOrder: 'നിങ്ങൾക്ക് এই ഓർഡർ സ്വീകരിക്കണോ?',
    confirmMarkReady: 'ഈ ഓർഡർ തയ്യാറായതായി അടയാളപ്പെടുത്തണോ?',
    confirmRejectOrder: 'നിങ്ങൾക്ക് ഈ ഓർഡർ നിരസിക്കണോ?',
    confirmCompleteOrder: 'നിങ്ങൾക്ക് ഈ ഓർഡർ പൂർത്തിയാക്കണോ?',
    refLabel: 'റഫറൻസ്',
    unknownUser: 'അജ്ഞാത ഉപയോക്താവ്',
    selfPickupBadge: 'സ്വയം വന്ന് എടുക്കേണ്ട ഓർഡർ',
    qtyLabel: 'അളവ്',

    // Profile
    contactInformation: 'ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ',
    mobileNumber: 'മൊബൈൽ നമ്പർ',
    primaryAddress: 'പ്രധാന വിലാസം',
    secondaryAddress: 'രണ്ടാം വിലാസം',
    servicePincodes: 'സർവീസ് പിൻകോഡുകൾ',
    logout: 'ലോഗൗട്ട്',

    // Analytics
    daily: 'ദിവസം',
    monthly: 'മാസം',
    stock: 'സ്റ്റോക്ക്',
    totalRevenue: 'ആകെ വരുമാനം',
    totalOrders: 'ആകെ ഓർഡറുകൾ',
    statusFailed: 'പരാജയപ്പെട്ടു',
    failed: 'പരാജയപ്പെട്ടു',

    // Navigation Tabs
    homeTab: 'ഹോം',
    ordersTab: 'ഓർഡറുകൾ',
    analyticsTab: 'അനലിറ്റിക്സ്',
    profileTab: 'പ്രൊഫൈൽ',

    // Add Product
    addNewProduct: 'പുതിയ ഉൽപ്പന്നം ചേർക്കുക',
    addNewService: 'പുതിയ സേവനം ചേർക്കുക',
    selectCategory: 'വിഭാഗം തിരഞ്ഞെടുക്കുക',
    productName: 'ഉൽപ്പന്നത്തിന്റെ പേര്',
    serviceName: 'സേവനത്തിന്റെ പേര്',
    description: 'വിവരണം',
    price: 'വില',
    stockQty: 'സ്റ്റോക്ക്',
    images: 'ചിത്രങ്ങൾ',
    pickImages: 'ചിത്രങ്ങൾ തിരഞ്ഞെടുക്കുക',
    upload: 'അപ്‌ലോഡ് ചെയ്യുക',
    createProductBtn: 'ഉൽപ്പന്നം സൃഷ്ടിക്കുക',
    createServiceBtn: 'സേവനം സൃഷ്ടിക്കുക',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}