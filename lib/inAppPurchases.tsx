// @ts-nocheck

export const PRODUCT_IDS = {
  monthly: "monthly",
  yearly: "yearly",
  giftSmall: "gift_small",
  giftMedium: "gift_medium",
  giftLarge: "gift_large",
};

export const GIFT_METADATA = {
  gift_small: { points: 100, label: "Small Gift" },
  gift_medium: { points: 500, label: "Medium Gift" },
  gift_large: { points: 1000, label: "Large Gift" },
};

export const iapService = {
  initialize: async () => true,
  destroy: async () => true,
  purchaseProduct: async (productId: string) => ({ success: true, productId }),
  restorePurchases: async () => [],
};
