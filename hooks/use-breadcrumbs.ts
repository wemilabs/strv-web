"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  type Crumb,
  useBreadcrumbs,
} from "@/components/context/breadcrumbs-context";

const routeConfig: Record<string, (params: string[]) => Crumb[]> = {
  // Static routes
  "/": () => [],
  "/sign-in": () => [{ label: "Sign In" }],
  "/dashboard": () => [{ label: "Dashboard" }],
  "/stores": () => [{ label: "Stores" }],
  "/merchants": () => [{ label: "Merchants" }],
  "/products": () => [{ label: "Products" }],
  "/point-of-sales/orders": () => [{ label: "POS" }, { label: "Orders" }],
  "/point-of-sales/inventory": () => [{ label: "POS" }, { label: "Inventory" }],
  "/point-of-sales/analytics": () => [{ label: "POS" }, { label: "Analytics" }],
  "/point-of-sales/wallet": () => [{ label: "POS" }, { label: "Wallet" }],
  "/usage/billing": () => [{ label: "Billing" }],
  "/usage/pricing": () => [{ label: "Pricing" }],

  "/trends-and-socials": () => [{ label: "Trends & Socials" }],
  "/merchant-studio/how-it-works": () => [
    { label: "Merchant Studio" },
    { label: "How it works" },
  ],
  "/support": () => [{ label: "Support" }],
  "/feedback": () => [{ label: "Feedback" }],
  "/unauthorized": () => [{ label: "Unauthorized" }],

  // Admin routes
  "/admin": () => [{ label: "Admin" }],
  "/admin/user-management": () => [
    { label: "Admin", href: "/admin" },
    { label: "User Management" },
  ],
  "/admin/feedback-management": () => [
    { label: "Admin", href: "/admin" },
    { label: "Feedback Management" },
  ],
  "/admin/email-management": () => [
    { label: "Admin", href: "/admin" },
    { label: "Email Management" },
  ],

  // Dynamic routes
  "/stores/[storeSlug]": params => [
    { label: "Stores", href: "/stores" },
    { label: formatDynamicSlug(params[0]) },
  ],
  "/merchants/[merchantSlug]": params => [
    { label: "Merchants", href: "/merchants" },
    { label: formatDynamicSlug(params[0]) },
  ],
  "/products/[productSlug]": params => [
    { label: "Products", href: "/products" },
    { label: formatDynamicSlug(params[0]) },
  ],
  "/products/category/[categorySlug]": params => [
    { label: "Products", href: "/products" },
    { label: "Category" },
    { label: formatDynamicSlug(params[0]) },
  ],
  "/point-of-sales/orders/[orderId]": params => [
    { label: "POS" },
    { label: "Orders", href: "/point-of-sales/orders" },
    { label: `Order #${formatDynamicSegment(params[0])}` },
  ],
  "/point-of-sales/wallet/transactions/[transactionId]": params => [
    { label: "POS" },
    { label: "Wallet", href: "/point-of-sales/wallet" },
    { label: "Transactions" },
    { label: `Transaction #${formatDynamicSegment(params[0])}` },
  ],
  "/users/[userId]": params => [
    { label: "Users" },
    { label: formatDynamicSegment(params[0]) },
  ],
};

function formatDynamicSlug(slug: string): string {
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDynamicSegment(id: string): string {
  return id.slice(-8) || id;
}

// Find matching route configuration
function findRouteConfig(
  pathname: string,
): { config: (params: string[]) => Crumb[]; params: string[] } | null {
  // First try exact matches
  if (routeConfig[pathname]) {
    return { config: routeConfig[pathname], params: [] };
  }

  // Then try dynamic routes
  const segments = pathname.split("/").filter(Boolean);

  for (const [route, config] of Object.entries(routeConfig)) {
    const routeSegments = route.split("/").filter(Boolean);

    if (segments.length !== routeSegments.length) continue;

    const params: string[] = [];
    let isMatch = true;

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      const pathSegment = segments[i];

      if (routeSegment.startsWith("[") && routeSegment.endsWith("]")) {
        params.push(pathSegment);
      } else if (routeSegment !== pathSegment) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      return { config, params };
    }
  }

  return null;
}

// Generate breadcrumbs from pathname as fallback
function generateBreadcrumbsFromPath(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];

  segments.forEach((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const label = segment
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    crumbs.push({
      label,
      href: index === segments.length - 1 ? undefined : href,
    });
  });

  return crumbs;
}

export function useAutoBreadcrumbs() {
  const pathname = usePathname();
  const { setCrumbs } = useBreadcrumbs();

  const routeMatch = findRouteConfig(pathname);

  const computedCrumbs = routeMatch
    ? pathname === "/"
      ? [{ label: "Home" }]
      : [{ label: "Home", href: "/" }, ...routeMatch.config(routeMatch.params)]
    : pathname === "/"
      ? [{ label: "Home" }]
      : [
          { label: "Home", href: "/" },
          ...generateBreadcrumbsFromPath(pathname),
        ];

  // Update context with computed breadcrumbs
  useEffect(() => {
    setCrumbs(computedCrumbs);
  }, [computedCrumbs, setCrumbs]);
}
