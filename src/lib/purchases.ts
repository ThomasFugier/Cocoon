import { Platform } from "react-native";
import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesPackage } from "react-native-purchases";

import { DesireCategory, UnlockedFeature } from "../types";
import { supabase } from "./supabase";

export type PurchasableTarget =
  | { kind: "category"; category: Exclude<DesireCategory, "Vanille" | "Perso"> }
  | { kind: "feature"; feature: UnlockedFeature };

export type PurchaseProductConfig = {
  entitlement: string;
  productId: string;
  target: PurchasableTarget;
};

const revenueCatIosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "";
const revenueCatAndroidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? "";

const categoryProductIds: Record<Exclude<DesireCategory, "Vanille" | "Perso">, string> = {
  "Sensuel": "wespice_pack_sensuel",
  "Séduction": "wespice_pack_seduction",
  "Hot": "wespice_pack_hot",
  "Jeux & Défis": "wespice_pack_jeux_defis",
  "Scénarios": "wespice_pack_scenarios",
  "Kinky Soft": "wespice_pack_kinky_soft",
  "BDSM": "wespice_pack_bdsm",
  "Plaisirs explicites": "wespice_pack_plaisirs_explicites",
  "Tabous": "wespice_pack_tabous",
};

const featureProductIds: Record<UnlockedFeature, string> = {
  custom_cards_unlimited: "wespice_custom_cards_unlimited",
  no_ads: "wespice_no_ads",
  unlimited_responses: "wespice_unlimited_responses",
};

const categoryEntitlements: Record<Exclude<DesireCategory, "Vanille" | "Perso">, string> = {
  "Sensuel": "pack_sensuel",
  "Séduction": "pack_seduction",
  "Hot": "pack_hot",
  "Jeux & Défis": "pack_jeux_defis",
  "Scénarios": "pack_scenarios",
  "Kinky Soft": "pack_kinky_soft",
  "BDSM": "pack_bdsm",
  "Plaisirs explicites": "pack_plaisirs_explicites",
  "Tabous": "pack_tabous",
};

const featureEntitlements: Record<UnlockedFeature, string> = {
  custom_cards_unlimited: "custom_cards_unlimited",
  no_ads: "no_ads",
  unlimited_responses: "unlimited_responses",
};

let configuredUserId: string | null = null;

function revenueCatApiKey() {
  if (Platform.OS === "ios") {
    return revenueCatIosApiKey;
  }

  if (Platform.OS === "android") {
    return revenueCatAndroidApiKey;
  }

  return "";
}

export function hasRevenueCatConfig() {
  return Boolean(revenueCatIosApiKey || revenueCatAndroidApiKey);
}

export function categoryPurchaseConfig(category: Exclude<DesireCategory, "Vanille" | "Perso">): PurchaseProductConfig {
  return {
    entitlement: categoryEntitlements[category],
    productId: categoryProductIds[category],
    target: { kind: "category", category },
  };
}

export function featurePurchaseConfig(feature: UnlockedFeature): PurchaseProductConfig {
  return {
    entitlement: featureEntitlements[feature],
    productId: featureProductIds[feature],
    target: { kind: "feature", feature },
  };
}

export function purchaseTargetKey(target: PurchasableTarget) {
  return target.kind === "category" ? `category:${target.category}` : `feature:${target.feature}`;
}

export async function configureRevenueCat(appUserId: string) {
  const apiKey = revenueCatApiKey();

  if (!apiKey || Platform.OS === "web") {
    return false;
  }

  Purchases.setLogLevel(process.env.NODE_ENV === "production" ? LOG_LEVEL.WARN : LOG_LEVEL.DEBUG);

  const isConfigured = await Purchases.isConfigured().catch(() => false);

  if (!isConfigured) {
    Purchases.configure({ apiKey, appUserID: appUserId });
    configuredUserId = appUserId;
    return true;
  }

  if (configuredUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredUserId = appUserId;
  }

  return true;
}

async function findPackageForProduct(productId: string) {
  const offerings = await Purchases.getOfferings();
  const packages = Object.values(offerings.all).flatMap((offering) => offering.availablePackages ?? []);
  const currentPackages = offerings.current?.availablePackages ?? [];
  const allPackages = [...currentPackages, ...packages];

  return allPackages.find((candidate) => candidate.product.identifier === productId) ?? null;
}

async function verifyPurchaseOnServer({
  appUserId,
  config,
  coupleId,
  customerInfo,
}: {
  appUserId: string;
  config: PurchaseProductConfig;
  coupleId: string;
  customerInfo: CustomerInfo;
}) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configuré.");
  }

  const { data, error } = await supabase.functions.invoke("verify-purchase", {
    body: {
      app_user_id: appUserId,
      couple_id: coupleId,
      customer_info: customerInfo,
      entitlement: config.entitlement,
      product_id: config.productId,
      target: config.target,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function purchaseWithRevenueCat({
  appUserId,
  config,
  coupleId,
}: {
  appUserId: string;
  config: PurchaseProductConfig;
  coupleId: string;
}) {
  const configured = await configureRevenueCat(appUserId);

  if (!configured) {
    throw new Error("RevenueCat n'est pas configuré pour cette plateforme.");
  }

  const rcPackage: PurchasesPackage | null = await findPackageForProduct(config.productId);

  if (!rcPackage) {
    throw new Error(`Produit RevenueCat introuvable: ${config.productId}`);
  }

  const result = await Purchases.purchasePackage(rcPackage);
  await verifyPurchaseOnServer({ appUserId, config, coupleId, customerInfo: result.customerInfo });

  return result.customerInfo;
}

export async function restoreRevenueCatPurchases(appUserId: string, coupleId: string) {
  const configured = await configureRevenueCat(appUserId);

  if (!configured) {
    throw new Error("RevenueCat n'est pas configuré pour cette plateforme.");
  }

  const customerInfo = await Purchases.restorePurchases();

  if (!supabase) {
    throw new Error("Supabase n'est pas configuré.");
  }

  const { error } = await supabase.functions.invoke("verify-purchase", {
    body: {
      app_user_id: appUserId,
      couple_id: coupleId,
      customer_info: customerInfo,
      restore: true,
    },
  });

  if (error) {
    throw error;
  }

  return customerInfo;
}
