import { useTranslation } from "react-i18next";

export function useAppFonts() {
  const { i18n } = useTranslation();
  const isMl = i18n.language === 'ml';

  return {
    isMl,
    fontRegular: isMl ? "NotoSansMalayalam_400Regular" : "Poppins_400Regular",
    fontMedium: isMl ? "NotoSansMalayalam_400Regular" : "Poppins_500Medium",
    fontSemiBold: isMl ? "NotoSansMalayalam_700Bold" : "Poppins_600SemiBold",
    fontBold: isMl ? "NotoSansMalayalam_700Bold" : "Poppins_700Bold",
    // Tailwind class helpers
    classRegular: isMl ? "font-malayalam" : "font-poppins",
    classMedium: isMl ? "font-malayalam" : "font-poppins-medium",
    classBold: isMl ? "font-malayalam-bold" : "font-poppins-bold",
    
    // Style helper for direct font family assignment
    styleRegular: { fontFamily: isMl ? "NotoSansMalayalam_400Regular" : "Poppins_400Regular" },
    styleMedium: { fontFamily: isMl ? "NotoSansMalayalam_400Regular" : "Poppins_500Medium" },
    styleSemiBold: { fontFamily: isMl ? "NotoSansMalayalam_700Bold" : "Poppins_600SemiBold" },
    styleBold: { fontFamily: isMl ? "NotoSansMalayalam_700Bold" : "Poppins_700Bold" },
  };
}
