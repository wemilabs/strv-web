"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { unitFormat } from "@/db/schema";
import { slugify } from "@/lib/utils";

const createUnitFormatSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
});

export async function createUnitFormat(
  input: z.infer<typeof createUnitFormatSchema>,
) {
  const parsed = createUnitFormatSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: z.treeifyError(parsed.error),
      unitFormat: null,
    } as const;
  }

  try {
    const { name, description } = parsed.data;
    const slug = slugify(name);

    const existing = await db
      .select()
      .from(unitFormat)
      .where(eq(unitFormat.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return { ok: true, unitFormat: existing[0] } as const;
    }

    const [newUnitFormat] = await db
      .insert(unitFormat)
      .values({
        name,
        slug,
        description: description || null,
      })
      .returning();

    return { ok: true, unitFormat: newUnitFormat } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error(e);
    return { ok: false, error: e.message, unitFormat: null } as const;
  }
}

export async function getAllUnitFormats() {
  try {
    const unitFormats = await db
      .select()
      .from(unitFormat)
      .orderBy(unitFormat.name);

    return { ok: true, unitFormats } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error(e);
    return { ok: false, error: e.message, unitFormats: [] } as const;
  }
}

export async function seedDefaultUnitFormats() {
  const defaultFormats = [
    { name: "Piece", description: "Individual items" },
    { name: "Package", description: "Boxed items" },
    { name: "Bottle", description: "Liquid containers" },
    { name: "Box", description: "Boxed items" },
    { name: "Bag", description: "Bagged items" },
    { name: "Kilogram", description: "Weight in kg" },
    { name: "Gram", description: "Weight in grams" },
    { name: "Liter", description: "Volume in liters" },
    { name: "Milliliter", description: "Volume in ml" },
    { name: "Dozen", description: "12 pieces" },
    { name: "Pair", description: "2 pieces" },
    { name: "Set", description: "Collection of items" },
    { name: "Roll", description: "Rolled items" },
    { name: "Sheet", description: "Flat items" },
    { name: "Tube", description: "Tubular items" },
    { name: "Jar", description: "Jarred items" },
    { name: "Can", description: "Canned items" },
    { name: "Meter", description: "Length in meters" },
    { name: "Centimeter", description: "Length in cm" },
    { name: "Square Meter", description: "Area measurement" },
    { name: "Hour", description: "Time-based services" },
    { name: "Day", description: "Daily rentals/services" },
    { name: "Session", description: "Service sessions" },
    { name: "Subscription", description: "Subscription-based" },
    { name: "License", description: "Software licenses" },
  ];

  try {
    const results = [];
    for (const format of defaultFormats) {
      const result = await createUnitFormat(format);
      if (result.ok) {
        results.push(result.unitFormat);
      }
    }

    return { ok: true, count: results.length } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error(e);
    return { ok: false, error: e.message, count: 0 } as const;
  }
}
