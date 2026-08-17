"use client";

import { Filter, Search, X } from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tag } from "@/db/schema";

type ProductFiltersProps = {
  availableTags: Array<Tag & { productCount: number }>;
};

export function ProductFilters({ availableTags }: ProductFiltersProps) {
  const [{ search, tags, sort }, setFilters] = useQueryStates(
    {
      search: parseAsString.withDefault(""),
      tags: parseAsArrayOf(parseAsString).withDefault([]),
      sort: parseAsString.withDefault("newest"),
    },
    {
      shallow: false,
      throttleMs: 300,
    },
  );

  const toggleTag = (tagSlug: string) => {
    const newTags = tags.includes(tagSlug)
      ? tags.filter(t => t !== tagSlug)
      : [...tags, tagSlug];

    setFilters({ tags: newTags.length > 0 ? newTags : null });
  };

  const clearAllFilters = () => {
    setFilters({ search: null, tags: null, sort: "newest" });
  };

  const hasActiveFilters = search || tags.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div className="w-full sm:w-[460px] lg:w-[380px]">
          <div className="bg-background has-[input:focus]:ring-muted relative grid grid-cols-[1fr_auto] items-center rounded-lg border shadow shadow-zinc-950/5 has-[input:focus]:ring-2 transition duration-300 ease-in-out">
            <Label htmlFor="product-search" className="sr-only">
              Search products
            </Label>
            <Input
              id="product-search"
              type="search"
              placeholder="Search products..."
              className="w-full h-9 bg-transparent pl-10 focus:outline-none rounded-lg placeholder:text-sm transition duration-300 ease-in-out"
              value={search}
              onChange={e => setFilters({ search: e.target.value || null })}
            />

            {search ? (
              <button
                type="reset"
                onClick={() => setFilters({ search: null })}
                className="absolute top-1/2 right-3.5 -translate-y-1/2 transition duration-300 ease-in-out"
              >
                <X className="size-4 opacity-50" />
              </button>
            ) : null}
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 opacity-50 select-none" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <Select
            value={sort}
            onValueChange={value => setFilters({ sort: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8"
            >
              <X className="size-4" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {availableTags.length > 0 && (
        <>
          <p className="text-sm font-medium mb-2">Tags:</p>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <Badge
                key={tag.id}
                variant={tags.includes(tag.slug) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag.slug)}
              >
                {tag.name}
                <span className="ml-1 text-xs opacity-70">
                  ({tag.productCount})
                </span>
              </Badge>
            ))}
          </div>
        </>
      )}

      {tags.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-mono tracking-tighter">
            Active tags:
          </span>
          <div className="flex flex-wrap gap-2">
            {tags.map(tagSlug => {
              const tag = availableTags.find(t => t.slug === tagSlug);
              return tag ? (
                <Badge key={tagSlug} variant="secondary" className="gap-1">
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => toggleTag(tagSlug)}
                    className="ml-1 rounded-full"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
