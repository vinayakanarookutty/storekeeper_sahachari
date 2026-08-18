// app/services/auth.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "jwt_token";

export async function saveToken(token: string): Promise<void> {
  try {
    console.log("AsyncStorage: Saving token...");
    await AsyncStorage.setItem(TOKEN_KEY, token);

    // Verify it was saved
    const verification = await AsyncStorage.getItem(TOKEN_KEY);
    if (verification === token) {
      console.log("AsyncStorage: Token verified and saved successfully");
    } else {
      console.error("AsyncStorage: Token verification failed!");
    }
  } catch (error) {
    console.error("AsyncStorage: Error saving token:", error);
    throw error;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    console.log(
      "AsyncStorage: Getting token -",
      token ? "Token exists" : "No token found",
    );
    return token;
  } catch (error) {
    console.error("AsyncStorage: Error getting token:", error);
    return null;
  }
}

export async function removeToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    console.log("AsyncStorage: Token removed successfully");

    // Verify removal
    const verification = await AsyncStorage.getItem(TOKEN_KEY);
    if (verification === null) {
      console.log("AsyncStorage: Token removal verified");
    }
  } catch (error) {
    console.error("AsyncStorage: Error removing token:", error);
    throw error;
  }
}

const USER_KEY = "auth_user_data";

export async function saveUser(user: any): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("AsyncStorage: Error saving user:", error);
  }
}

export async function getUser(): Promise<any | null> {
  try {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("AsyncStorage: Error getting user:", error);
    return null;
  }
}

export async function removeUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error("AsyncStorage: Error removing user:", error);
  }
}

