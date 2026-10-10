import type { Metadata } from "next";

import { FeedbackContent } from "@/components/feedback/feedback-content";
import { APP_URL, GENERAL_BRANDING_IMG_URL } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Feedback - Starva.shop";
  const description =
    "Share your thoughts and feedback with us. Help us improve Starva.shop by providing your valuable feedback.";

  const feedbackUrl = `${APP_URL}/feedback`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: feedbackUrl,
      type: "website",
      images: [
        {
          url: GENERAL_BRANDING_IMG_URL,
          width: 1200,
          height: 630,
          alt: "Starva.shop app - A sure platform for local stores and customers to meet. Easy, fast and reliable.",
        },
      ],
      siteName: "Starva.shop",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [GENERAL_BRANDING_IMG_URL],
    },
    alternates: {
      canonical: feedbackUrl,
    },
  };
}

export default async function FeedbackPage() {
  return <FeedbackContent />;
}
