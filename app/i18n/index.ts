import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ml from "./locales/ml.json";

export const LANGUAGE_KEY = "app_language";

export async function initializeLanguage() {
  const savedLanguage =
    (await AsyncStorage.getItem(LANGUAGE_KEY)) || "en";

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        ml: { translation: ml },
      },
      lng: savedLanguage,
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
    });
  } else {
    await i18n.changeLanguage(savedLanguage);
  }

  return savedLanguage;
}

export async function changeLanguage(language: "en" | "ml") {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
  await i18n.changeLanguage(language);
}

export default i18n;