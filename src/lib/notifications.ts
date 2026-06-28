import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { registerRemotePushToken } from "./coupleApi";

const PUSH_DEVICE_ID_KEY = "wespice.push.device_id";
export const WESPICE_ANDROID_CHANNEL_ID = "wespice-default";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PushRegistrationStatus = "registered" | "denied" | "unavailable" | "misconfigured";

export type PushRegistrationResult = {
  reason?: string;
  status: PushRegistrationStatus;
  token?: string;
};

function notificationPlatform(): "ios" | "android" | "web" | "unknown" {
  if (Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web") {
    return Platform.OS;
  }

  return "unknown";
}

function notificationProjectId() {
  return (
    Constants.easConfig?.projectId
    ?? Constants.expoConfig?.extra?.eas?.projectId
    ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    ?? ""
  );
}

async function deviceId() {
  if (Platform.OS === "web") {
    return "web";
  }

  const stored = await SecureStore.getItemAsync(PUSH_DEVICE_ID_KEY);

  if (stored) {
    return stored;
  }

  const generated = Crypto.randomUUID();
  await SecureStore.setItemAsync(PUSH_DEVICE_ID_KEY, generated);

  return generated;
}

export async function configureNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(WESPICE_ANDROID_CHANNEL_ID, {
    description: "Messages, matchs et signaux importants de WeSpice.",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#FF2A74",
    name: "WeSpice",
    vibrationPattern: [0, 180, 120, 180],
  });
}

async function expoPushToken() {
  const projectId = notificationProjectId();

  if (!projectId) {
    return null;
  }

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

async function registerCurrentDevice(token: string) {
  await registerRemotePushToken({
    deviceId: await deviceId(),
    enabled: true,
    platform: notificationPlatform(),
    token,
  });
}

export async function syncPushTokenIfAlreadyGranted(): Promise<PushRegistrationResult> {
  await configureNotificationChannel();

  if (Platform.OS === "web" || !Device.isDevice) {
    return { reason: "Les push notifications demandent un appareil iOS ou Android physique.", status: "unavailable" };
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== "granted") {
    return { reason: "Permission non accordée.", status: "denied" };
  }

  const token = await expoPushToken();
  if (!token) {
    return { reason: "Project ID EAS manquant.", status: "misconfigured" };
  }

  await registerCurrentDevice(token);

  return { status: "registered", token };
}

export async function requestPushPermissionAndRegister(): Promise<PushRegistrationResult> {
  await configureNotificationChannel();

  if (Platform.OS === "web" || !Device.isDevice) {
    return { reason: "Les push notifications demandent un appareil iOS ou Android physique.", status: "unavailable" };
  }

  const existing = await Notifications.getPermissionsAsync();
  const finalPermissions = existing.status === "granted" ? existing : await Notifications.requestPermissionsAsync();

  if (finalPermissions.status !== "granted") {
    return { reason: "Permission refusée.", status: "denied" };
  }

  const token = await expoPushToken();
  if (!token) {
    return { reason: "Project ID EAS manquant.", status: "misconfigured" };
  }

  await registerCurrentDevice(token);

  return { status: "registered", token };
}
