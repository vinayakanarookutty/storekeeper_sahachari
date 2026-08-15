// app/login.tsx

import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "./contexts/AuthContext";
import { useLanguage } from "./contexts/LanguageContext";
import {
  getCurrentUser,
  loginApi,
} from "./services/api";
import { styles } from "./styles/login.style";

// =========================================================
// CONSTANTS
// =========================================================

const MIN_PASSWORD_LENGTH = 6;

// =========================================================
// ALERT HELPER
// =========================================================

const showAlert = (
  title: string,
  message: string
) => {
  if (Platform.OS === "web") {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// =========================================================
// EMAIL VALIDATION
// =========================================================

const isValidEmail = (email: string) => {
  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email.trim());
};

// =========================================================
// API ERROR HANDLER
// =========================================================

const getLoginErrorMessage = (
  error: any
): string => {
  const responseData =
    error?.response?.data;

  // Backend string message
  if (
    typeof responseData?.message ===
    "string"
  ) {
    return responseData.message;
  }

  // Backend validation messages
  if (
    Array.isArray(responseData?.message)
  ) {
    return responseData.message.join(", ");
  }

  // Error response
  if (
    typeof responseData?.error === "string"
  ) {
    return responseData.error;
  }

  // Normal JS/Axios error
  if (
    typeof error?.message === "string"
  ) {
    return error.message;
  }

  return "Unable to login. Please check your email and password.";
};

// =========================================================
// LOGIN SCREEN
// =========================================================

export default function LoginScreen() {
  const router = useRouter();

  const { setAuthToken } = useAuth();

  const queryClient = useQueryClient();

  const {
    language,
    setLanguage,
    t,
  } = useLanguage();

  // =======================================================
  // FORM STATE
  // =======================================================

  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  // Validation errors
  const [emailError, setEmailError] =
    useState("");

  const [passwordError, setPasswordError] =
    useState("");

  // =======================================================
  // LOGIN MUTATION
  // =======================================================

  const loginMutation = useMutation({
    mutationFn: async (credentials: {
      email: string;
      password: string;
    }) => {
      return await loginApi(credentials);
    },

    // -------------------------------------------------------
    // SUCCESS
    // -------------------------------------------------------

    onSuccess: async (data) => {
      try {
        // Save access token
        await setAuthToken(
          data.accessToken
        );

        // Fetch current user
        try {
          const userData =
            await getCurrentUser();

          queryClient.setQueryData(
            ["currentUser"],
            userData
          );
        } catch (error) {
          console.log(
            "Could not fetch user data:",
            error
          );
        }

        // Navigate to home
        router.replace("/");
      } catch (error) {
        console.error(
          "Login success handling failed:",
          error
        );

        showAlert(
          t.errorTitle || "Error",
          "Login succeeded, but we could not complete the session setup. Please try again."
        );
      }
    },

    // -------------------------------------------------------
    // ERROR
    // -------------------------------------------------------

    onError: (error: any) => {
      console.error(
        "Login error:",
        error?.response?.data || error
      );

      showAlert(
        t.failedTitle || "Login Failed",
        getLoginErrorMessage(error)
      );
    },
  });

  // =======================================================
  // EMAIL CHANGE
  // =======================================================

  const handleEmailChange = (
    value: string
  ) => {
    setEmail(value);

    // Clear error while typing
    if (emailError) {
      setEmailError("");
    }
  };

  // =======================================================
  // PASSWORD CHANGE
  // =======================================================

  const handlePasswordChange = (
    value: string
  ) => {
    setPassword(value);

    // Clear error while typing
    if (passwordError) {
      setPasswordError("");
    }
  };

  // =======================================================
  // EMAIL VALIDATION
  // =======================================================

  const validateEmail = () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setEmailError(
        "Email address is required"
      );

      return false;
    }

    if (!isValidEmail(cleanEmail)) {
      setEmailError(
        "Please enter a valid email address"
      );

      return false;
    }

    setEmailError("");

    return true;
  };

  // =======================================================
  // PASSWORD VALIDATION
  // =======================================================

  const validatePassword = () => {
    if (!password.trim()) {
      setPasswordError(
        "Password is required"
      );

      return false;
    }

    if (
      password.length <
      MIN_PASSWORD_LENGTH
    ) {
      setPasswordError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      );

      return false;
    }

    setPasswordError("");

    return true;
  };

  // =======================================================
  // FULL FORM VALIDATION
  // =======================================================

  const validateForm = () => {
    const emailValid =
      validateEmail();

    const passwordValid =
      validatePassword();

    return (
      emailValid && passwordValid
    );
  };

  // =======================================================
  // HANDLE LOGIN
  // =======================================================

  const handleLogin = () => {
    // Prevent duplicate requests
    if (loginMutation.isPending) {
      return;
    }

    // Validate
    if (!validateForm()) {
      return;
    }

    // Trim email only
    const cleanEmail =
      email.trim();

    loginMutation.mutate({
      email: cleanEmail,
      password,
    });
  };

  // =======================================================
  // LANGUAGE
  // =======================================================

  const toggleLanguage = () => {
    const nextLang =
      language === "en"
        ? "ml"
        : "en";

    setLanguage(nextLang);
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
      style={styles.container}
    >
      {/* ===================================================
          LANGUAGE BUTTON
      ==================================================== */}

      <View
        style={{
          width: "100%",
          alignItems: "flex-end",
          paddingHorizontal: 24,
          paddingTop: 16,
        }}
      >
        <TouchableOpacity
          onPress={toggleLanguage}
          disabled={
            loginMutation.isPending
          }
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F4EFE6",
            paddingVertical: 6,
            paddingHorizontal: 14,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#E6DCCD",
            opacity:
              loginMutation.isPending
                ? 0.6
                : 1,
          }}
        >
          <FontAwesome
            name="globe"
            size={15}
            color="#A89378"
            style={{
              marginRight: 6,
            }}
          />

          <Text
            style={{
              color: "#2D2416",
              fontWeight: "600",
              fontSize: 13,
            }}
          >
            {language === "en"
              ? "മലയാളം"
              : "English"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ===================================================
          SCROLL VIEW
      ==================================================== */}

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.content}>
          {/* =================================================
              TITLE
          ================================================== */}

          <Text style={styles.title}>
            {t.welcomeBack}
          </Text>

          <Text style={styles.subtitle}>
            {t.loginSubtitle}
          </Text>

          {/* =================================================
              FORM
          ================================================== */}

          <View style={styles.form}>
            {/* ===============================================
                EMAIL
            ================================================ */}

            <TextInput
              style={[
                styles.input,
                emailError
                  ? {
                      borderColor:
                        "#EF4444",
                      borderWidth: 1,
                    }
                  : undefined,
              ]}
              placeholder={
                t.emailPlaceholder
              }
              placeholderTextColor="#A89378"
              value={email}
              onChangeText={
                handleEmailChange
              }
              onBlur={validateEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={
                !loginMutation.isPending
              }
              returnKeyType="next"
            />

            {/* Email Error */}

            {emailError ? (
              <Text
                style={{
                  color: "#EF4444",
                  fontSize: 12,
                  marginTop: -8,
                  marginBottom: 10,
                  paddingHorizontal: 4,
                }}
              >
                {emailError}
              </Text>
            ) : null}

            {/* ===============================================
                PASSWORD
            ================================================ */}

            <View
              style={[
                styles.passwordContainer,
                passwordError
                  ? {
                      borderColor:
                        "#EF4444",
                      borderWidth: 1,
                    }
                  : undefined,
              ]}
            >
              <TextInput
                style={
                  styles.passwordInput
                }
                placeholder={
                  t.passwordPlaceholder
                }
                placeholderTextColor="#A89378"
                value={password}
                onChangeText={
                  handlePasswordChange
                }
                onBlur={
                  validatePassword
                }
                secureTextEntry={
                  !showPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                editable={
                  !loginMutation.isPending
                }
                returnKeyType="done"
                onSubmitEditing={
                  handleLogin
                }
              />

              {/* Password Visibility */}

              <TouchableOpacity
                style={
                  styles.eyeIcon
                }
                onPress={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                disabled={
                  loginMutation.isPending
                }
                hitSlop={{
                  top: 10,
                  bottom: 10,
                  left: 10,
                  right: 10,
                }}
              >
                <FontAwesome
                  name={
                    showPassword
                      ? "eye"
                      : "eye-slash"
                  }
                  size={20}
                  color="#A89378"
                />
              </TouchableOpacity>
            </View>

            {/* Password Error */}

            {passwordError ? (
              <Text
                style={{
                  color: "#EF4444",
                  fontSize: 12,
                  marginTop: -8,
                  marginBottom: 10,
                  paddingHorizontal: 4,
                }}
              >
                {passwordError}
              </Text>
            ) : null}

            {/* ===============================================
                LOGIN BUTTON
            ================================================ */}

            <TouchableOpacity
              style={[
                styles.button,
                loginMutation.isPending &&
                  styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={
                loginMutation.isPending
              }
              activeOpacity={0.8}
            >
              {loginMutation.isPending ? (
                <View
                  style={{
                    flexDirection:
                      "row",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                  }}
                >
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                  />

                  <Text
                    style={[
                      styles.buttonText,
                      {
                        marginLeft: 8,
                      },
                    ]}
                  >
                    Logging in...
                  </Text>
                </View>
              ) : (
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  {t.logInLabel}
                </Text>
              )}
            </TouchableOpacity>

            {/* ===============================================
                FORGOT PASSWORD
            ================================================ */}

            <TouchableOpacity
              style={
                styles.forgotPassword
              }
              onPress={() =>
                router.push(
                  "/forgot-password" as any
                )
              }
              disabled={
                loginMutation.isPending
              }
              activeOpacity={0.7}
            >
              <Text
                style={
                  styles.forgotPasswordText
                }
              >
                {t.forgotPasswordLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}