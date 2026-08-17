"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db/drizzle";
import { organization } from "@/db/schema";
import { auth } from "@/lib/auth";
import { extractFileKeyFromUrl, utapi } from "@/lib/uploadthing-server";
import { getCurrentMetadata } from "./organizations";

export async function updateStoreLogo(
  storeId: string,
  resolvedSlug: string,
  formData: FormData,
) {
  const logoUrl = String(formData.get("logoUrl") || "").trim();
  if (!logoUrl) return;

  // Get the old logo URL to delete it
  const currentStore = await db
    .select({ logo: organization.logo })
    .from(organization)
    .where(eq(organization.id, storeId))
    .limit(1);

  // Delete old logo from UploadThing if it exists
  if (currentStore.length > 0 && currentStore[0].logo) {
    try {
      const oldLogoUrl = currentStore[0].logo;
      const fileKey = extractFileKeyFromUrl(oldLogoUrl);
      if (fileKey) {
        await utapi.deleteFiles(fileKey);
        console.log(`Successfully deleted old logo: ${fileKey}`);
      }
    } catch (error) {
      console.error("Failed to delete old logo:", error);
    }
  }

  await db
    .update(organization)
    .set({ logo: logoUrl })
    .where(eq(organization.id, storeId));

  revalidatePath(`/stores/${resolvedSlug}`);
}

export async function updateStoreName(
  storeId: string,
  storeSlug: string,
  name: string,
) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  await auth.api.updateOrganization({
    body: {
      organizationId: storeId,
      data: {
        name: trimmedName,
      },
    },
    headers: await headers(),
  });

  revalidatePath(`/stores/${storeSlug}`);
}

export async function updateStoreDescription(
  storeId: string,
  storeSlug: string,
  description: string,
) {
  const trimmedDescription = description.trim();

  const currentMetadata = await getCurrentMetadata(storeId);

  await auth.api.updateOrganization({
    body: {
      organizationId: storeId,
      data: {
        metadata: {
          ...currentMetadata,
          description: trimmedDescription,
        },
      },
    },
    headers: await headers(),
  });

  revalidatePath(`/stores/${storeSlug}`);
}

export async function updateStorePhone(
  storeId: string,
  storeSlug: string,
  phoneType: "notifications" | "payments",
  phoneNumber: string,
) {
  const trimmedPhone = phoneNumber.trim();

  const currentMetadata = await getCurrentMetadata(storeId);

  const updatedMetadata = {
    ...currentMetadata,
    ...(phoneType === "notifications"
      ? { phoneForNotifications: trimmedPhone }
      : { phoneForPayments: trimmedPhone }),
  };

  await auth.api.updateOrganization({
    body: {
      organizationId: storeId,
      data: {
        metadata: updatedMetadata,
      },
    },
    headers: await headers(),
  });

  revalidatePath(`/stores/${storeSlug}`);
}

export async function updateStoreTimetable(
  storeId: string,
  storeSlug: string,
  timetable: Record<string, { open: string; close: string; closed: boolean }>,
) {
  const currentMetadata = await getCurrentMetadata(storeId);

  await auth.api.updateOrganization({
    body: {
      organizationId: storeId,
      data: {
        metadata: {
          ...currentMetadata,
          timetable,
        },
      },
    },
    headers: await headers(),
  });

  revalidatePath(`/stores/${storeSlug}`);
}

export async function updateStoreTimezone(
  _prevState: { success: boolean; error: string | null },
  formData: FormData,
) {
  const storeId = formData.get("storeId") as string;
  const storeSlug = formData.get("storeSlug") as string;
  const timezone = formData.get("timezone") as string;

  if (!storeId || !storeSlug || !timezone) {
    return {
      success: false,
      error: "Missing required fields",
    };
  }

  try {
    const currentMetadata = await getCurrentMetadata(storeId);

    await auth.api.updateOrganization({
      body: {
        organizationId: storeId,
        data: {
          metadata: {
            ...currentMetadata,
            timezone,
          },
        },
      },
      headers: await headers(),
    });

    revalidatePath(`/stores/${storeSlug}`);
    revalidatePath("/settings");

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error("Failed to update timezone:", error);
    return {
      success: false,
      error: "Failed to update timezone. Please try again.",
    };
  }
}

export async function deleteStore(storeId: string) {
  await auth.api.deleteOrganization({
    body: {
      organizationId: storeId,
    },
    headers: await headers(),
  });

  revalidatePath("/stores");
}
