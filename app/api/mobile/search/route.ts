import { connection, type NextRequest } from "next/server";
import { z } from "zod";

import { getFilteredProducts } from "@/data/products";
import { getAllStoresWithFollowData } from "@/data/stores";
import type { ProductCategory } from "@/db/schema";
import {
  errorResponse,
  getMobileSession,
  successResponse,
  unauthorizedResponse,
} from "@/lib/mobile-auth";

const searchSchema = z.object({
  q: z.string().optional(),
  tab: z.enum(["all", "stores", "products"]).optional(),
  category: z.custom<ProductCategory>().optional(),
  organizationId: z.string().min(1).optional(),
  sortBy: z
    .enum(["newest", "oldest", "price_low", "price_high", "popular"])
    .optional(),
});

const includesCI = (value: string, query: string) =>
  value.toLowerCase().includes(query.toLowerCase());

export async function GET(request: NextRequest) {
  await connection();

  try {
    const session = await getMobileSession();
    if (!session?.user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);

    const parsed = searchSchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      tab: searchParams.get("tab") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      organizationId: searchParams.get("organizationId") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
    });

    if (!parsed.success) return errorResponse("Invalid search parameters", 400);

    const { q, tab = "all", category, organizationId, sortBy } = parsed.data;

    const wantsMerchants = tab === "all" || tab === "stores";
    const wantsProducts = tab === "all" || tab === "products";

    const merchants = wantsMerchants
      ? ((await getAllStoresWithFollowData())?.filter(m =>
          q ? includesCI(m.name, q) : true,
        ) ?? [])
      : [];

    const products = wantsProducts
      ? (await getFilteredProducts({ search: q, sortBy }))
          .filter(p => (category ? p.category === category : true))
          .filter(p =>
            organizationId ? p.organizationId === organizationId : true,
          )
      : [];

    return successResponse({
      merchants,
      products,
      totalMerchants: merchants.length,
      totalProducts: products.length,
    });
  } catch (error) {
    console.error("Failed to search:", error);
    return errorResponse("Failed to search", 500);
  }
}
