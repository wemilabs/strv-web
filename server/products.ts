"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { verifySession } from "@/data/user-session";
import { db } from "@/db/drizzle";
import type { ProductCategory } from "@/db/schema";
import {
  productLike,
  product as productTable,
  productTag,
  tag,
  unitFormat,
} from "@/db/schema";
import { extractFileKeyFromUrl, utapi } from "@/lib/uploadthing-server";
import { slugify } from "@/lib/utils";

const productSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(120),
  price: z.string().min(1),
  description: z.string().optional().default(""),
  imageUrls: z.array(z.url()).optional().default([]),
  videoUrl: z.url().optional().or(z.literal("")),
  category: z.string().min(1),
  specifications: z.string().optional().default(""),
  isLandlord: z.boolean(),
  visitFees: z.string(),
  tagNames: z.array(z.string()).optional().default([]),
  unitFormatId: z.string().nullable().optional(),
  unitFormatName: z.string().optional(),
  inventoryEnabled: z.boolean(),
  lowStockThreshold: z.number().min(0),
  revalidateTargetPath: z.string().min(1),
});

export async function createProduct(input: z.infer<typeof productSchema>) {
  const verified = await verifySession();
  if (!verified.success) return { ok: false, error: "Unauthorized" };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: z.treeifyError(parsed.error) };

  try {
    const {
      organizationId,
      name,
      slug,
      price,
      description,
      imageUrls,
      videoUrl,
      category,
      specifications,
      isLandlord,
      visitFees,
      tagNames,
      unitFormatId,
      unitFormatName,
      inventoryEnabled,
      lowStockThreshold,
      revalidateTargetPath,
    } = parsed.data;

    // Handle unit format creation if needed
    let finalUnitFormatId = unitFormatId;
    if (!unitFormatId && unitFormatName) {
      const unitSlug = slugify(unitFormatName);
      const existingUnit = await db
        .select()
        .from(unitFormat)
        .where(eq(unitFormat.slug, unitSlug))
        .limit(1);

      if (existingUnit.length > 0) {
        finalUnitFormatId = existingUnit[0].id;
      } else {
        const [newUnit] = await db
          .insert(unitFormat)
          .values({
            name: unitFormatName,
            slug: unitSlug,
          })
          .returning();
        finalUnitFormatId = newUnit.id;
      }
    }

    const [newProduct] = await db
      .insert(productTable)
      .values({
        name,
        slug,
        description: description || "",
        price,
        organizationId,
        imageUrls: imageUrls || [],
        videoUrl: videoUrl || null,
        status: "draft",
        category: category as ProductCategory,
        specifications: specifications || null,
        isLandlord,
        visitFees,
        unitFormatId: finalUnitFormatId || null,
        inventoryEnabled,
        currentStock: 0,
        lowStockThreshold,
      })
      .returning();

    if (tagNames && tagNames.length > 0) {
      const tagIds: string[] = [];

      for (const tagName of tagNames) {
        const tagSlug = slugify(tagName);

        const existingTag = await db
          .select()
          .from(tag)
          .where(eq(tag.slug, tagSlug))
          .limit(1);

        if (existingTag.length > 0) {
          tagIds.push(existingTag[0].id);
        } else {
          const [newTag] = await db
            .insert(tag)
            .values({
              name: tagName,
              slug: tagSlug,
            })
            .returning();
          tagIds.push(newTag.id);
        }
      }

      if (tagIds.length > 0) {
        const productTagValues = tagIds.map(tagId => ({
          productId: newProduct.id,
          tagId,
        }));
        await db.insert(productTag).values(productTagValues);
      }
    }

    revalidatePath(revalidateTargetPath);
    return { ok: true } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error(e);
    return { ok: false, error: e.message } as const;
  }
}

const updateProductSchema = productSchema.extend({
  productId: z.string().min(1),
  imageUrls: z.array(z.url()).optional().default([]),
  videoUrl: z.url().optional().or(z.literal("")),
});

export async function updateProduct(
  input: z.infer<typeof updateProductSchema>,
) {
  const verified = await verifySession();
  if (!verified.success) return { ok: false, error: "Unauthorized" };

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: z.treeifyError(parsed.error) } as const;

  try {
    const {
      productId,
      organizationId,
      name,
      slug,
      price,
      description,
      imageUrls,
      videoUrl,
      category,
      specifications,
      isLandlord,
      visitFees,
      tagNames,
      unitFormatId,
      unitFormatName,
      inventoryEnabled,
      lowStockThreshold,
      revalidateTargetPath,
    } = parsed.data;

    const existingProduct = await db
      .select({
        imageUrls: productTable.imageUrls,
        videoUrl: productTable.videoUrl,
      })
      .from(productTable)
      .where(
        and(
          eq(productTable.id, productId),
          eq(productTable.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (existingProduct.length === 0) {
      return { ok: false, error: "Product not found" } as const;
    }

    const oldImageUrls = existingProduct[0].imageUrls || [];
    const oldVideoUrl = existingProduct[0].videoUrl;
    const newImageUrls = imageUrls || [];
    const newVideoUrl = videoUrl || null;

    // Handle unit format creation/update if needed
    let finalUnitFormatId = unitFormatId;
    if (!unitFormatId && unitFormatName) {
      const unitSlug = slugify(unitFormatName);
      const existingUnit = await db
        .select()
        .from(unitFormat)
        .where(eq(unitFormat.slug, unitSlug))
        .limit(1);

      if (existingUnit.length > 0) {
        finalUnitFormatId = existingUnit[0].id;
      } else {
        const [newUnit] = await db
          .insert(unitFormat)
          .values({
            name: unitFormatName,
            slug: unitSlug,
          })
          .returning();
        finalUnitFormatId = newUnit.id;
      }
    }

    await db
      .update(productTable)
      .set({
        name,
        slug,
        description: description || "",
        price,
        imageUrls: newImageUrls,
        videoUrl: newVideoUrl,
        category: category as ProductCategory,
        specifications: specifications || null,
        isLandlord,
        visitFees,
        unitFormatId: finalUnitFormatId || null,
        inventoryEnabled,
        lowStockThreshold,
      })
      .where(
        and(
          eq(productTable.id, productId),
          eq(productTable.organizationId, organizationId),
        ),
      );

    if (tagNames) {
      await db.delete(productTag).where(eq(productTag.productId, productId));

      if (tagNames.length > 0) {
        const tagIds: string[] = [];

        for (const tagName of tagNames) {
          const tagSlug = slugify(tagName);

          const existingTag = await db
            .select()
            .from(tag)
            .where(eq(tag.slug, tagSlug))
            .limit(1);

          if (existingTag.length > 0) {
            tagIds.push(existingTag[0].id);
          } else {
            const [newTag] = await db
              .insert(tag)
              .values({
                name: tagName,
                slug: tagSlug,
              })
              .returning();
            tagIds.push(newTag.id);
          }
        }

        if (tagIds.length > 0) {
          const productTagValues = tagIds.map(tagId => ({
            productId,
            tagId,
          }));
          await db.insert(productTag).values(productTagValues);
        }
      }
    }

    after(async () => {
      // Delete old images that are not in the new array
      if (oldImageUrls && oldImageUrls !== newImageUrls) {
        try {
          const oldImagesToDelete = oldImageUrls.filter(
            url => !newImageUrls.includes(url),
          );
          for (const oldImageUrl of oldImagesToDelete) {
            const fileKey = extractFileKeyFromUrl(oldImageUrl);
            if (fileKey) {
              await utapi.deleteFiles(fileKey);
              console.log(`Successfully deleted old image: ${fileKey}`);
            }
          }
        } catch (error: unknown) {
          const e = error as Error;
          console.error(
            `Failed to delete old images from UploadThing: ${e.message}`,
          );
        }
      }

      // Delete old video if it's being replaced
      if (oldVideoUrl && oldVideoUrl !== newVideoUrl) {
        try {
          const fileKey = extractFileKeyFromUrl(oldVideoUrl);
          if (fileKey) {
            await utapi.deleteFiles(fileKey);
            console.log(`Successfully deleted old video: ${fileKey}`);
          }
        } catch (error: unknown) {
          const e = error as Error;
          console.error(
            `Failed to delete old video from UploadThing: ${e.message}`,
          );
        }
      }
    });

    revalidatePath(revalidateTargetPath);
    return { ok: true } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error(e);
    return { ok: false, error: e.message } as const;
  }
}

const deleteProductSchema = z.object({
  productId: z.string().min(1),
  organizationId: z.string().min(1),
  revalidateTargetPath: z.string().min(1),
});

export async function deleteProduct(
  input: z.infer<typeof deleteProductSchema>,
) {
  const verified = await verifySession();
  if (!verified.success) return { ok: false, error: "Unauthorized" };

  const parsed = deleteProductSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: z.treeifyError(parsed.error) } as const;

  try {
    const { productId, organizationId, revalidateTargetPath } = parsed.data;

    const productToDelete = await db
      .select({ imageUrls: productTable.imageUrls })
      .from(productTable)
      .where(
        and(
          eq(productTable.id, productId),
          eq(productTable.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (productToDelete.length === 0) {
      return { ok: false, error: "Product not found" } as const;
    }

    const { imageUrls } = productToDelete[0];

    await db
      .delete(productTable)
      .where(
        and(
          eq(productTable.id, productId),
          eq(productTable.organizationId, organizationId),
        ),
      );

    after(async () => {
      if (imageUrls && imageUrls.length > 0) {
        try {
          // Delete all images when product is deleted
          for (const imageUrl of imageUrls) {
            const fileKey = extractFileKeyFromUrl(imageUrl);
            if (fileKey) {
              await utapi.deleteFiles(fileKey);
              console.log(`Successfully deleted image: ${fileKey}`);
            }
          }
        } catch (error: unknown) {
          const e = error as Error;
          console.error(
            `Failed to delete images from UploadThing: ${e.message}`,
          );
        }
      }
    });

    revalidatePath(revalidateTargetPath);
    return { ok: true } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error(e);
    return { ok: false, error: e.message } as const;
  }
}

const toggleProductLikeSchema = z.object({
  productId: z.string().min(1),
  revalidateTargetPath: z.string().min(1),
});

export async function toggleProductLike(
  input: z.infer<typeof toggleProductLikeSchema>,
) {
  const parsed = toggleProductLikeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: z.treeifyError(parsed.error),
      isLiked: false,
      likesCount: 0,
    } as const;
  }

  try {
    const { success, session } = await verifySession();
    if (!success) {
      return {
        ok: false,
        error: "Unauthorized",
        isLiked: false,
        likesCount: 0,
      } as const;
    }

    const { productId, revalidateTargetPath } = parsed.data;
    const userId = session.user.id;

    const existingLike = await db
      .select()
      .from(productLike)
      .where(
        and(
          eq(productLike.productId, productId),
          eq(productLike.userId, userId),
        ),
      )
      .limit(1);

    const isLiked = existingLike.length === 0;

    if (!isLiked) {
      await db
        .delete(productLike)
        .where(
          and(
            eq(productLike.productId, productId),
            eq(productLike.userId, userId),
          ),
        );

      await db
        .update(productTable)
        .set({
          likesCount: sql`GREATEST(0, ${productTable.likesCount} - 1)`,
        })
        .where(eq(productTable.id, productId));
    } else {
      await db.insert(productLike).values({
        productId,
        userId,
      });

      await db
        .update(productTable)
        .set({
          likesCount: sql`${productTable.likesCount} + 1`,
        })
        .where(eq(productTable.id, productId));
    }

    const updatedProduct = await db
      .select({ likesCount: productTable.likesCount })
      .from(productTable)
      .where(eq(productTable.id, productId))
      .limit(1);

    const likesCount = updatedProduct[0]?.likesCount ?? 0;

    revalidatePath(revalidateTargetPath);
    return { ok: true, isLiked, likesCount } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error(e);
    return {
      ok: false,
      error: e.message,
      isLiked: false,
      likesCount: 0,
    } as const;
  }
}
