import type { FeedbackStatus, FeedbackType, OrderStatus } from "@/db/schema";

export const THEME_COLORS = { light: "#ffffff", dark: "#09090b" } as const;

export const APP_NAME = "Starva.shop";
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://starva.shop"
).replace(/\/+$/, "");
export const APP_DOMAIN = new URL(APP_URL).host;

export const GENERAL_BRANDING_IMG_URL =
  "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6du5UdXxlTLMJtliDeN9nXqzs57GUH6RgZbryB";
export const FALLBACK_PRODUCT_IMG_URL =
  "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6d89s9BRYhvCEDrKcu2HNpfYQo7eR4FUT8wVgS";
export const ERROR_PAGE_IMG_URL =
  "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6db6Se9J5oPvMdz2Zcih1tWnNrgmwjYaRqfCuK";
export const NOTFOUND_PAGE_IMG_URL =
  "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6dJdyQ7mebB6d1NpIUrVzHcsfFA7aEkjQ4oDvS";

export const PRODUCT_STATUS_VALUES = [
  "draft",
  "in_stock",
  "out_of_stock",
  "archived",
] as const;

export const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const COUNTRIES = [
  // African countries
  { code: "+250", name: "Rwanda", flag: "🇷🇼" },
  { code: "+241", name: "Gabon", flag: "🇬🇦" },
  { code: "+243", name: "DRC", flag: "🇨🇩" },
  { code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "+256", name: "Uganda", flag: "🇺🇬" },
  { code: "+255", name: "Tanzania", flag: "🇹🇿" },
  { code: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "+20", name: "Egypt", flag: "🇪🇬" },
  { code: "+212", name: "Morocco", flag: "🇲🇦" },
  { code: "+216", name: "Tunisia", flag: "🇹🇳" },
  { code: "+213", name: "Algeria", flag: "🇩🇿" },
  { code: "+251", name: "Ethiopia", flag: "🇪🇹" },
  { code: "+258", name: "Mozambique", flag: "🇲🇿" },
  { code: "+260", name: "Zambia", flag: "🇿🇲" },
  { code: "+263", name: "Zimbabwe", flag: "🇿🇼" },
  { code: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "+225", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "+221", name: "Senegal", flag: "🇸🇳" },
  { code: "+237", name: "Cameroon", flag: "🇨🇲" },

  // European countries
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "+46", name: "Sweden", flag: "🇸🇪" },
  // { code: "+31", name: "Netherlands", flag: "🇳🇱" },
  // { code: "+47", name: "Norway", flag: "�🇴" },
  // { code: "+45", name: "Denmark", flag: "�🇩🇰" },
  // { code: "+358", name: "Finland", flag: "🇫🇮" },
  // { code: "+41", name: "Switzerland", flag: "🇨🇭" },
  // { code: "+43", name: "Austria", flag: "🇦🇹" },
  // { code: "+32", name: "Belgium", flag: "🇧🇪" },
  // { code: "+48", name: "Poland", flag: "🇵🇱" },
  // { code: "+420", name: "Czech Republic", flag: "🇨🇿" },
  // { code: "+36", name: "Hungary", flag: "🇭🇺" },
  // { code: "+40", name: "Romania", flag: "🇷🇴" },
  // { code: "+30", name: "Greece", flag: "🇬🇷" },
  // { code: "+351", name: "Portugal", flag: "🇵🇹" },
  // { code: "+353", name: "Ireland", flag: "🇮🇪" },

  // American countries
  { code: "+1", name: "United States", flag: "🇺🇸" },
  // { code: "+52", name: "Mexico", flag: "🇲🇽" },
  // { code: "+55", name: "Brazil", flag: "🇧🇷" },
  // { code: "+54", name: "Argentina", flag: "🇦🇷" },
  // { code: "+56", name: "Chile", flag: "🇨🇱" },
  // { code: "+57", name: "Colombia", flag: "🇨🇴" },
  // { code: "+51", name: "Peru", flag: "🇵🇪" },
  // { code: "+58", name: "Venezuela", flag: "🇻🇪" },
  // { code: "+598", name: "Uruguay", flag: "🇺🇾" },
  // { code: "+593", name: "Ecuador", flag: "🇪🇨" },
  // { code: "+591", name: "Bolivia", flag: "🇧🇴" },
  // { code: "+595", name: "Paraguay", flag: "🇵🇾" },
  // { code: "+507", name: "Panama", flag: "🇵🇦" },
  // { code: "+506", name: "Costa Rica", flag: "🇨🇷" },
  // { code: "+503", name: "El Salvador", flag: "🇸🇻" },
  // { code: "+502", name: "Guatemala", flag: "🇬🇹" },
  // { code: "+504", name: "Honduras", flag: "🇭🇳" },
  // { code: "+505", name: "Nicaragua", flag: "🇳🇮" },
] as const;

export const ORDER_STATUS_VALUES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
] as const;

export const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

export const DEFAULT_HOURS = {
  open: "09:00",
  close: "17:00",
  closed: true,
} as const;

export const today = new Date()
  .toLocaleDateString("en-US", { weekday: "long" })
  .toLowerCase();

export const FEEDBACK_TYPE_LABELS = {
  bug: "🐛 Bug",
  feature: "✨ Feature",
  improvement: "📈 Improvement",
  general: "💬 General",
} as const;

export const FEEDBACK_STATUS_VARIANTS = {
  pending: "secondary",
  reviewing: "default",
  completed: "available",
  rejected: "destructive",
} as const;

export const FEEDBACK_TYPE_VALUES = [
  "bug",
  "feature",
  "improvement",
  "general",
] as const;

export const FEEDBACK_STATUS_VALUES = [
  "pending",
  "reviewing",
  "completed",
  "rejected",
] as const;

export const feedbackTypeOptions: {
  value: FeedbackType | "all";
  label: string;
}[] = [
  { value: "all", label: "All Types" },
  { value: "bug", label: "🐛 Bug" },
  { value: "feature", label: "✨ Feature" },
  { value: "improvement", label: "📈 Improvement" },
  { value: "general", label: "💬 General" },
];

export const feedbackStatusOptions: {
  value: FeedbackStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

export type PricingPlan = {
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  period: "month" | "year";
  orderLimit: number | null;
  maxOrgs: number | null;
  maxProductsPerOrg: number | null;
  additionalText: string;
  features: readonly string[];
  highlighted: boolean;
  cta: string;
};

export type BillingPeriod = "monthly" | "yearly";

export const USD_TO_RWF = 1457.39;
export const TRIAL_DAYS = 14;
export const ANNUAL_DISCOUNT_PERCENT = 10;

export const TRANSACTION_FEES = {
  PAYPACK_CASHIN_RATE: 0.03,
  PAYPACK_CASHOUT_RATE: 0.03,
  PLATFORM_RATE: 0.014,
  get TOTAL_RATE() {
    return (
      this.PAYPACK_CASHIN_RATE + this.PAYPACK_CASHOUT_RATE + this.PLATFORM_RATE
    );
  },
} as const;

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Starter",
    monthlyPrice: 30, // 50
    yearlyPrice: 324, // 540
    period: "month",
    orderLimit: 200,
    maxOrgs: 3,
    maxProductsPerOrg: 30,
    additionalText: "Includes:",
    features: [
      "3 stores",
      "30 products per store",
      "200 orders/month",
      "Sales dashboard",
      "14-day data retention",
      "Email support",
      "Full transaction processing",
    ],
    highlighted: false,
    cta: "Start 14-Day Free Trial",
  },
  {
    name: "Growth",
    monthlyPrice: 90, // 100
    yearlyPrice: 972, // 1080
    period: "month",
    orderLimit: 500,
    maxOrgs: 10,
    maxProductsPerOrg: 100,
    additionalText: "Everything in Starter, plus:",
    features: [
      "10 stores",
      "100 products per store",
      "500 orders/month",
      "Customer analytics",
      "AI-powered insights",
      "30-day data retention",
      "Priority support",
    ],
    highlighted: true,
    cta: "Start 14-Day Free Trial",
  },
  {
    name: "Pro",
    monthlyPrice: 200,
    yearlyPrice: 2160,
    period: "month",
    orderLimit: 2000,
    maxOrgs: 25,
    maxProductsPerOrg: 500,
    additionalText: "Everything in Growth, plus:",
    features: [
      "25 stores",
      "500 products per store",
      "2,000 orders/month",
      "Advanced analytics",
      "Full AI-powered management",
      "90-day data retention",
      "24/7 priority support",
      "API access",
    ],
    highlighted: false,
    cta: "Start 14-Day Free Trial",
  },
  {
    name: "Enterprise",
    monthlyPrice: 500,
    yearlyPrice: 5400,
    period: "month",
    orderLimit: null,
    maxOrgs: null,
    maxProductsPerOrg: null,
    additionalText: "Everything in Pro, plus:",
    features: [
      "Unlimited stores",
      "Unlimited products",
      "Unlimited orders",
      "Custom integrations",
      "White-label solutions",
      "Dedicated account manager",
      "SLA guarantee",
      "Unlimited data retention",
    ],
    highlighted: false,
    cta: "Contact Sales",
  },
] as const;

export function getPlanPrice(
  plan: PricingPlan,
  billingPeriod: BillingPeriod,
): number | null {
  return billingPeriod === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

export function getMonthlyEquivalent(
  plan: PricingPlan,
  billingPeriod: BillingPeriod,
): number | null {
  if (billingPeriod === "yearly" && plan.yearlyPrice) {
    return Math.round(plan.yearlyPrice / 12);
  }
  return plan.monthlyPrice;
}

export const CATEGORY_CONTENT: Record<
  string,
  {
    title: string;
    description: string;
    keywords: string[];
  }
> = {
  "health-wellness": {
    title: "Health & Wellness",
    description:
      "Discover vitamins, supplements, and wellness products from local partners",
    keywords: [
      "health",
      "wellness",
      "vitamins",
      "supplements",
      "fitness",
      "natural",
    ],
  },
  "food-groceries": {
    title: "Food & Groceries",
    description:
      "Fresh food, groceries, and meal ingredients from our local partners",
    keywords: ["food", "groceries", "fresh", "meals", "ingredients", "local"],
  },
  clothing: {
    title: "Clothing & Fashion",
    description:
      "Browse clothing, apparel, and fashion items from our local partners",
    keywords: ["clothing", "fashion", "apparel", "style", "outfits", "local"],
  },
  "real-estate": {
    title: "Real Estate & Property",
    description: "Find properties, apartments, and real estate services",
    keywords: [
      "real estate",
      "property",
      "apartments",
      "homes",
      "rentals",
      "housing",
    ],
  },
  footwear: {
    title: "Footwear & Shoes",
    description:
      "Discover shoes, sneakers, and footwear from our local partners",
    keywords: ["shoes", "footwear", "sneakers", "boots", "sandals", "local"],
  },
  "beauty-personal-care": {
    title: "Beauty & Personal Care",
    description: "Find beauty products, skincare, and personal care items",
    keywords: [
      "beauty",
      "skincare",
      "cosmetics",
      "personal care",
      "makeup",
      "grooming",
    ],
  },
  "jewelry-accessories": {
    title: "Jewelry & Accessories",
    description: "Browse jewelry, watches, and fashion accessories",
    keywords: [
      "jewelry",
      "accessories",
      "watches",
      "necklaces",
      "rings",
      "fashion",
    ],
  },
  electronics: {
    title: "Electronics & Gadgets",
    description: "Discover electronics, gadgets, and tech products",
    keywords: [
      "electronics",
      "gadgets",
      "tech",
      "devices",
      "computers",
      "phones",
    ],
  },
  appliances: {
    title: "Home Appliances",
    description: "Find home appliances and kitchen equipment",
    keywords: [
      "appliances",
      "home",
      "kitchen",
      "electronics",
      "equipment",
      "household",
    ],
  },
  furniture: {
    title: "Furniture & Home Decor",
    description: "Browse furniture, home decor, and interior items",
    keywords: [
      "furniture",
      "home decor",
      "interior",
      "sofas",
      "tables",
      "chairs",
    ],
  },
  "books-media": {
    title: "Books & Media",
    description: "Discover books, music, movies, and media content",
    keywords: ["books", "media", "music", "movies", "reading", "entertainment"],
  },
  automotive: {
    title: "Automotive & Vehicle Parts",
    description: "Find car parts, accessories, and automotive services",
    keywords: [
      "automotive",
      "cars",
      "vehicles",
      "parts",
      "accessories",
      "services",
    ],
  },
  "toys-games": {
    title: "Toys & Games",
    description: "Browse toys, games, and entertainment for all ages",
    keywords: ["toys", "games", "entertainment", "kids", "play", "fun"],
  },
  others: {
    title: "Other Products",
    description: "Discover unique products and miscellaneous items",
    keywords: [
      "miscellaneous",
      "unique",
      "special",
      "other",
      "various",
      "diverse",
    ],
  },
} as const;

export const CATEGORY_CONFIG = {
  "food-groceries": {
    label: "Food & Groceries",
    icon: "ShoppingCart",
    priority: 1,
  },
  clothing: {
    label: "Clothing",
    icon: "Shirt",
    priority: 2,
  },
  "real-estate": {
    label: "Real Estate",
    icon: "Home",
    priority: 3,
  },
  electronics: {
    label: "Electronics",
    icon: "Smartphone",
    priority: 4,
  },
  "health-wellness": {
    label: "Health & Wellness",
    icon: "Heart",
    priority: 5,
  },
  footwear: {
    label: "Footwear",
    icon: "Footprints",
    priority: 6,
  },
  "beauty-personal-care": {
    label: "Beauty & Personal Care",
    icon: "Sparkles",
    priority: 7,
  },
  "jewelry-accessories": {
    label: "Jewelry & Accessories",
    icon: "Gem",
    priority: 8,
  },
  appliances: {
    label: "Appliances",
    icon: "Refrigerator",
    priority: 9,
  },
  furniture: {
    label: "Furniture",
    icon: "Sofa",
    priority: 10,
  },
  "books-media": {
    label: "Books & Media",
    icon: "BookOpen",
    priority: 11,
  },
  automotive: {
    label: "Automotive",
    icon: "Car",
    priority: 12,
  },
  "toys-games": {
    label: "Toys & Games",
    icon: "Gamepad2",
    priority: 13,
  },
  others: {
    label: "Others",
    icon: "MoreHorizontal",
    priority: 14,
  },
} as const;

export const HERO_IMAGES = [
  {
    src: "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6dWgCq0iLAZB6Qo3FrkqV8SYhsv4eu9Oi2jMPf",
    alt: "Healthy nigerian food showcasing ready-eat delicious meals",
  },
  {
    src: "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6dbJAZ4ZX5oPvMdz2Zcih1tWnNrgmwjYaRqfCu",
    alt: "A set of diverse colored shirts showcasing clothing",
  },
  {
    src: "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6dvbJOADIQPkhj1f2AYaXbVmvCu3Row6eDlJxE",
    alt: "Antique Golden Jewelery from Ancient Egypt",
  },
  {
    src: "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6dschy7bxjUQJANPlGO1ZFogVMpIn4Y05zyWDr",
    alt: "House with a beautiful garden showcasing real estate",
  },
  {
    src: "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6dAKKAPiDqbEWlKLtN1oeBTCR4PGIhX0O2m6VU",
    alt: "A mix of diverse shoes showcasing footwear",
  },
  {
    src: "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6dXSKPW7FrDwsIL6SElt8PgWAcRu57BaQqbkjo",
    alt: "Beauty and personal care products",
  },
  {
    src: "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6dKhhdT3F4pzfmF7e8cGUbILY2sRTlaynxgkZV",
    alt: "Phones and gadgets showcasing electronics",
  },
  {
    src: "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6d5p1u7dHQDYgawe3pLMcSzA2BRrmUC7In0yNG",
    alt: "Appliances",
  },
  {
    src: "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6dGKinkxQ39wuqkW71FtJiLjgBns5eZO2mM8hT",
    alt: "Books and media",
  },
  {
    src: "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6du6Y0vA8lTLMJtliDeN9nXqzs57GUH6RgZbry",
    alt: "Beautiful home furnitures",
  },
  {
    src: "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6dSIZ3mZ4MCDtSP4O75M2BIcxXKWVmwyqoRTHd",
    alt: "Games and toys",
  },
  {
    src: "https://hsl8jk540a.ufs.sh/f/JFF4Q8WebB6dcbh1MBmIArhnvfDRX0Z6MmjGTiPByVkcOxHe",
    alt: "Cars and automotive",
  },
] as const;

export const TIMEZONES = [
  { value: "Africa/Kigali", label: "Rwanda Time (Kigali, GMT+2)" },
  { value: "Africa/Nairobi", label: "East Africa Time (Nairobi, GMT+3)" },
  { value: "Africa/Lagos", label: "West Africa Time (Lagos, GMT+1)" },
  { value: "Europe/London", label: "Greenwich Mean Time (London, GMT+0)" },
  { value: "Europe/Paris", label: "Central European Time (Paris, GMT+1)" },
  { value: "America/New_York", label: "Eastern Time (New York, GMT-5)" },
  { value: "America/Los_Angeles", label: "Pacific Time (LA, GMT-8)" },
] as const;
