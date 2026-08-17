"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { productTag, tag } from "@/db/schema";
import { slugify } from "@/lib/utils";

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
});

export async function createTag(input: z.infer<typeof createTagSchema>) {
  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: z.treeifyError(parsed.error),
      tag: null,
    } as const;
  }

  try {
    const { name, description } = parsed.data;
    const slug = slugify(name);

    const existing = await db
      .select()
      .from(tag)
      .where(eq(tag.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return { ok: true, tag: existing[0] } as const;
    }

    const [newTag] = await db
      .insert(tag)
      .values({
        name,
        slug,
        description: description || null,
      })
      .returning();

    return { ok: true, tag: newTag } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error(e);
    return { ok: false, error: e.message, tag: null } as const;
  }
}

const linkProductTagsSchema = z.object({
  productId: z.string().min(1),
  tagIds: z.array(z.string()),
  organizationId: z.string().min(1),
  revalidateTargetPath: z.string().min(1),
});

export async function linkProductTags(
  input: z.infer<typeof linkProductTagsSchema>,
) {
  const parsed = linkProductTagsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: z.treeifyError(parsed.error) } as const;
  }

  try {
    const { productId, tagIds, revalidateTargetPath } = parsed.data;

    await db.delete(productTag).where(eq(productTag.productId, productId));

    if (tagIds.length > 0) {
      const values = tagIds.map(tagId => ({
        productId,
        tagId,
      }));
      await db.insert(productTag).values(values);
    }

    revalidatePath(revalidateTargetPath);
    return { ok: true } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error(e);
    return { ok: false, error: e.message } as const;
  }
}

const deleteTagSchema = z.object({
  tagId: z.string().min(1),
  revalidateTargetPath: z.string().min(1),
});

export async function deleteTag(input: z.infer<typeof deleteTagSchema>) {
  const parsed = deleteTagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: z.treeifyError(parsed.error) } as const;
  }

  try {
    const { tagId, revalidateTargetPath } = parsed.data;

    await db.delete(tag).where(eq(tag.id, tagId));

    revalidatePath(revalidateTargetPath);
    return { ok: true } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error(e);
    return { ok: false, error: e.message } as const;
  }
}

export async function getAllTags() {
  try {
    const tags = await db.select().from(tag).orderBy(tag.name);

    return { ok: true, tags } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error(e);
    return { ok: false, error: e.message, tags: [] } as const;
  }
}

export async function getProductTags(productId: string) {
  try {
    const productTags = await db.query.productTag.findMany({
      where: eq(productTag.productId, productId),
      with: {
        tag: true,
      },
    });

    return { ok: true, tags: productTags.map(pt => pt.tag) } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error(e);
    return { ok: false, error: e.message, tags: [] } as const;
  }
}
