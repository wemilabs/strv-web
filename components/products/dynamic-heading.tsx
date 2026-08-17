"use client";

import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { CATEGORY_CONTENT } from "@/lib/constants";

interface DynamicHeadingProps {
  initialSearch?: string;
  initialTags?: string[];
  categorySlug?: string;
}

export function DynamicHeading({
  initialSearch,
  initialTags,
  categorySlug,
}: DynamicHeadingProps) {
  const [{ search, tags }] = useQueryStates(
    {
      search: parseAsString.withDefault(""),
      tags: parseAsArrayOf(parseAsString).withDefault([]),
    },
    {
      shallow: false,
      throttleMs: 300,
    },
  );

  const headingInfo = categorySlug
    ? CATEGORY_CONTENT[categorySlug]
    : {
        title: "All",
        description:
          "Discover a wide range of products and services from our local partners",
      };

  let heading = `Browse ${headingInfo.title}`;
  let subheading = headingInfo.description;

  // Use client-side values if available, otherwise fall back to initial values
  const currentSearch = search || initialSearch || "";
  const currentTags = tags.length > 0 ? tags : initialTags || [];

  if (currentSearch) {
    heading = `Search results for "${currentSearch}"`;
    subheading = `Find products matching "${currentSearch}" from our local partners`;
  }

  if (currentTags && currentTags.length > 0) {
    const tagLabels = currentTags.join(", ");
    if (currentSearch) {
      heading += ` in ${tagLabels}`;
      subheading += ` in ${tagLabels} categories`;
    } else {
      heading = `${tagLabels} products`;
      subheading = `Browse "${tagLabels}" products from our local partners`;
    }
  }

  return (
    <div className="mb-8">
      <h1 className="font-medium tracking-tight text-2xl">{heading}</h1>
      <p className="text-sm text-pretty text-muted-foreground font-mono tracking-tighter">
        {subheading}
      </p>
    </div>
  );
}
