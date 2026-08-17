"use client";

import { usePathname } from "next/navigation";
import { useQueryState } from "nuqs";
import { StoreCard } from "./store-card";

type StoreWithFollowData = {
  id: string;
  name: string;
  createdAt: Date;
  slug: string;
  logo: string | null;
  metadata: string | null;
  followersCount?: number;
  productsCount?: number;
  isFollowing?: boolean;
};

type StoreCatalogueSectionProps = {
  data: StoreWithFollowData[] | null;
};

export function FilteredStore({ data }: StoreCatalogueSectionProps) {
  const [search] = useQueryState("search", { defaultValue: "" });
  const pathname = usePathname();

  const filteredStores = data?.filter(store => {
    const matchesSearch =
      store.name.toLowerCase().includes(search.toLowerCase()) ||
      store.slug.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  if (!filteredStores?.length)
    return (
      <div className="col-span-full flex items-center justify-center min-h-[200px] border border-dashed border-muted-foreground/50 rounded-lg">
        <div className="text-muted-foreground text-center">
          <p className="text-sm">
            No {pathname === "/merchants" ? "merchants" : "stores"} found
            matching your search
          </p>
        </div>
      </div>
    );

  return filteredStores.map(store => (
    <StoreCard
      key={store.id}
      store={store}
      followersCount={store.followersCount}
      productsCount={store.productsCount}
      isFollowing={store.isFollowing}
    />
  ));
}
