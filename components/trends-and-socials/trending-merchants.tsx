"use client";

import { useQuery } from "@tanstack/react-query";
import { Store, Users } from "lucide-react";
import Link from "next/link";

import { OrganizationFollowButton } from "@/components/follows/organization-follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials } from "@/lib/utils";
import { fetchTrendingMerchants } from "@/server/trends";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Skeleton } from "../ui/skeleton";

const TrendingMerchantsContent = () => {
  const { data: merchants = [], isLoading } = useQuery<
    Awaited<ReturnType<typeof fetchTrendingMerchants>>
  >({
    queryKey: ["trending-merchants"],
    queryFn: () => fetchTrendingMerchants(20),
    // staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-50" />
        <Skeleton className="h-50" />
        <Skeleton className="h-50" />
        <Skeleton className="h-50" />
        <Skeleton className="h-50" />
        <Skeleton className="h-50" />
      </div>
    );
  }

  if (merchants.length === 0) {
    return (
      <Empty className="min-h-[400px] border border-dashed border-muted-foreground/50">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Store className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No merchants yet</EmptyTitle>
          <EmptyDescription className="font-mono tracking-tighter">
            Merchants will appear here once they join the platform.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {merchants.map(merchant => (
        <Card
          key={merchant.id}
          className="group hover:shadow-md transition-shadow"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start gap-4">
              <Link href={`/merchants/${merchant.slug}`}>
                <Avatar className="size-14 ring-2 ring-border group-hover:ring-primary/50 transition-all">
                  <AvatarImage src={merchant.logo ?? ""} alt={merchant.name} />
                  <AvatarFallback className="bg-linear-to-br from-primary to-red-500 text-white font-semibold">
                    {getInitials(merchant.name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/merchants/${merchant.slug}`}
                  className="hover:opacity-80"
                >
                  <CardTitle className="text-base truncate">
                    {merchant.name}
                  </CardTitle>
                </Link>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono tracking-tighter">
                  {merchant.description || "No description"}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Users className="size-3" />
                  <span>{merchant.followersCount}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <OrganizationFollowButton
              organizationId={merchant.id}
              initialIsFollowing={merchant.isFollowing}
              initialFollowersCount={merchant.followersCount}
              revalidateTargetPath="/trends-and-socials"
              className="w-full"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TrendingMerchantsContent;
