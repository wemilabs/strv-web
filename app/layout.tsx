import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense, ViewTransition } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { BreadcrumbManager } from "@/components/breadcrumb-manager";
import { BreadcrumbsProvider } from "@/components/context/breadcrumbs-context";
import { Header } from "@/components/header";
import { HeaderSkeleton } from "@/components/header-skeleton";
import { QueryProvider } from "@/components/providers/query-client-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { UploadThingProvider } from "@/components/providers/uploadthing-provider";
import { UpstashRealtimeProvider } from "@/components/providers/upstash-realtime-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { ThemeColorSync } from "@/components/pwa/theme-color-sync";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import {
  APP_URL,
  GENERAL_BRANDING_IMG_URL,
  THEME_COLORS,
} from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Starva.shop - The Next Generation Social Marketplace",
  description:
    "Search. Shop. Smile. - Starva.shop is the super fast, secure, reliable and easy to use next-gen social marketplace.",
  metadataBase: new URL(APP_URL),
  keywords: [
    "starva",
    "Starva.shop",
    "store",
    "store",
    "local stores",
    "customer",
    "meeting",
    "local store",
    "local customer",
    "store customer",
    "food",
    "fast-food",
    "restaurant",
    "dress-up",
    "clothing",
    "housing",
    "real-estate",
    "rental",
    "rental property",
    "jewelry",
    "cars",
  ],
  authors: [
    {
      name: "Mr T",
      url: "https://lisham.dev/",
    },
  ],
  creator: "Lisham",
  applicationName: "Starva.shop",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Starva" },
  icons: {
    icon: [
      {
        url: "/starva-dot-shop-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/starva-dot-shop-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    title: "Starva.shop - The Next Generation Social Marketplace",
    description:
      "Search. Shop. Smile. - Starva.shop is the super fast, secure, reliable and easy to use next-gen social marketplace.",
    siteName: "Starva.shop",
    images: [
      {
        url: GENERAL_BRANDING_IMG_URL,
        width: 1200,
        height: 630,
        alt: "Starva.shop - Search. Shop. Smile.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Starva.shop - The Next Generation Social Marketplace",
    description:
      "Search. Shop. Smile. - Starva.shop is the super fast, secure, reliable and easy to use next-gen social marketplace.",
    images: [GENERAL_BRANDING_IMG_URL],
    creator: "@mthlish",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

export default async function RootLayout(props: LayoutProps<"/">) {
  const { children, auth } = props;
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeColorSync />
          <UpstashRealtimeProvider>
            {auth}
            <QueryProvider>
              <BreadcrumbsProvider>
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset>
                    <Suspense fallback={<HeaderSkeleton />}>
                      <Header />
                    </Suspense>
                    <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
                      <Suspense fallback={null}>
                        <BreadcrumbManager />
                      </Suspense>
                      <NuqsAdapter>
                        <Suspense>
                          <UploadThingProvider />
                        </Suspense>
                        <ViewTransition>{children}</ViewTransition>
                      </NuqsAdapter>
                    </main>
                  </SidebarInset>
                </SidebarProvider>
              </BreadcrumbsProvider>
              <Toaster richColors />
            </QueryProvider>
          </UpstashRealtimeProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
