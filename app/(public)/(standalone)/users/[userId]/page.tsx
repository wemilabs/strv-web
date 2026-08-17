import { Heart, MessageCircle, Store, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Suspense } from "react";

import { UserFollowButton } from "@/components/follows/user-follow-button";
import { ProductCard } from "@/components/products/product-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserByIdWithFollowStatus, getUserProfileData } from "@/data/users";
import { getInitials } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const user = await getUserByIdWithFollowStatus(userId);

  if (!user) {
    return {
      title: "User Not Found",
    };
  }

  return {
    title: `${user.name} (@${user.id.slice(0, 8)}) | Starva.shop`,
    description: `View ${user.name}'s profile on Starva`,
  };
}

async function UserProfileContent({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const profileUser = await getUserByIdWithFollowStatus(userId);
  if (!profileUser) notFound();

  const {
    likedProducts,
    viewerLikedSet,
    followers,
    following,
    followedOrgs,
    viewerUserId,
  } = await getUserProfileData(userId);

  const bioLines = [profileUser.email].filter(Boolean);

  const formattedFollowers = Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(profileUser.followersCount);

  const formattedFollowing = Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(profileUser.followingCount);

  const formattedLikes = Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(profileUser.likesCount);

  const ProfileStat = ({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) => {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div className="text-base font-semibold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground leading-none">
          {label}
        </div>
      </div>
    );
  };

  const UserListItem = ({
    id,
    name,
    image,
    followersCount,
    isFollowing,
  }: {
    id: string;
    name: string;
    image: string | null;
    followersCount: number;
    isFollowing: boolean;
  }) => {
    return (
      <Link
        href={`/users/${id}`}
        className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
      >
        <Avatar className="size-10 ring-1 ring-border">
          <AvatarImage src={image ?? ""} alt={name} />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">
            {Intl.NumberFormat("en", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(followersCount)}{" "}
            follower{followersCount <= 1 ? "" : "s"}
          </div>
        </div>
        <Activity
          mode={
            viewerUserId && viewerUserId !== id && !isFollowing
              ? "visible"
              : "hidden"
          }
        >
          <UserFollowButton
            userId={id}
            initialIsFollowing={false}
            initialFollowersCount={followersCount}
            revalidateTargetPath={`/users/${userId}`}
            variant="compact"
          />
        </Activity>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center justify-center sm:justify-between gap-4 sm:flex-row mx-auto sm:mx-0 w-full">
          <Avatar className="size-36 ring-2 ring-border">
            <AvatarImage src={profileUser.image ?? ""} alt={profileUser.name} />
            <AvatarFallback className="text-2xl font-semibold bg-linear-to-br from-primary to-red-500 text-white">
              {getInitials(profileUser.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                <div className="min-w-0 flex items-center justify-between gap-2">
                  <h1 className="truncate text-2xl font-bold leading-tight">
                    {profileUser.name}
                  </h1>
                  <span className="text-sm text-muted-foreground truncate mt-1">
                    @{profileUser.id.slice(0, 8)}
                  </span>
                </div>
              </div>

              <div className="flex items-center mx-auto sm:mx-0 gap-x-6">
                <ProfileStat label="Following" value={formattedFollowing} />
                <ProfileStat
                  label={
                    Number(formattedFollowers) <= 1 ? "Follower" : "Followers"
                  }
                  value={formattedFollowers}
                />
                <ProfileStat
                  label={Number(formattedLikes) <= 1 ? "Like" : "Likes"}
                  value={formattedLikes}
                />
              </div>

              <div className="space-y-1 mx-auto sm:mx-0">
                {bioLines.map(line => (
                  <div key={line} className="text-sm text-muted-foreground">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Activity mode={profileUser.isSelf ? "hidden" : "visible"}>
            <div className="flex items-center gap-2">
              <UserFollowButton
                userId={userId}
                initialIsFollowing={profileUser.isFollowing}
                initialFollowersCount={profileUser.followersCount}
                revalidateTargetPath={`/users/${userId}`}
              />
              <Button type="button" variant="outline" className="gap-2">
                <MessageCircle className="size-4" />
                <span className="text-sm">Message</span>
              </Button>
            </div>
          </Activity>
        </div>
      </div>

      <Tabs defaultValue="liked" className="w-full">
        <div className="flex items-center justify-between gap-3 border-b">
          <TabsList className="bg-transparent p-0 h-auto rounded-none mx-auto gap-x-2.5 sm:gap-x-4 md:gap-x-6 lg:gap-x-10">
            <TabsTrigger
              value="liked"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Heart className="size-4" />
              Liked
            </TabsTrigger>
            <TabsTrigger
              value="followers"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Users className="size-4" />
              Followers
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Following
            </TabsTrigger>
            <TabsTrigger
              value="stores"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Stores
            </TabsTrigger>
            <TabsTrigger
              value="followed-orgs"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Store className="size-4" />
              Followed
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="liked" className="pt-5">
          {likedProducts.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed">
              <div className="text-sm text-muted-foreground">
                No liked products yet
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {likedProducts.map(p => (
                <ProductCard
                  key={p.id}
                  {...p}
                  organization={p.organization}
                  href={p.slug}
                  isLiked={viewerLikedSet.has(p.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="followers" className="pt-5">
          {followers.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed">
              <div className="text-sm text-muted-foreground">
                No followers yet
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {followers.map(u => (
                <UserListItem
                  key={u.id}
                  id={u.id}
                  name={u.name}
                  image={u.image}
                  followersCount={u.followersCount}
                  isFollowing={u.isFollowing}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="following" className="pt-5">
          {following.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed">
              <div className="text-sm text-muted-foreground">
                Not following anyone yet
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {following.map(u => (
                <UserListItem
                  key={u.id}
                  id={u.id}
                  name={u.name}
                  image={u.image}
                  followersCount={u.followersCount}
                  isFollowing={u.isFollowing}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stores" className="pt-5">
          <Activity
            mode={profileUser.members.length > 0 ? "visible" : "hidden"}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profileUser.members.map(membership => (
                <Link
                  key={membership.id}
                  href={`/merchants/${membership.organization.slug}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="size-10">
                    <AvatarImage
                      src={membership.organization.logo ?? ""}
                      alt={membership.organization.name}
                    />
                    <AvatarFallback>
                      {getInitials(membership.organization.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {membership.organization.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {membership.role}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Activity>

          <Activity
            mode={profileUser.members.length === 0 ? "visible" : "hidden"}
          >
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed">
              <div className="text-sm text-muted-foreground">No stores</div>
            </div>
          </Activity>
        </TabsContent>

        <TabsContent value="followed-orgs" className="pt-5">
          {followedOrgs.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed">
              <div className="text-sm text-muted-foreground">
                No followed organizations yet
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {followedOrgs.map(org => {
                const followersCount =
                  (typeof org.metadata === "string"
                    ? JSON.parse(org.metadata)
                    : org.metadata
                  )?.followersCount ?? 0;

                return (
                  <Link
                    key={org.id}
                    href={`/merchants/${org.slug}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="size-10">
                      <AvatarImage src={org.logo ?? ""} alt={org.name} />
                      <AvatarFallback>{getInitials(org.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{org.name}</p>
                      <div className="text-xs text-muted-foreground">
                        {Intl.NumberFormat("en", {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }).format(followersCount)}{" "}
                        follower{followersCount <= 1 ? "" : "s"}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default async function UserProfilePage(
  props: PageProps<"/users/[userId]">,
) {
  return (
    <div className="container max-w-4xl pt-8 pb-2 mx-auto">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="flex items-start gap-6">
              <Skeleton className="size-24 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex gap-6">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-10 w-28" />
                </div>
              </div>
            </div>
            <Skeleton className="h-10 w-80" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </div>
          </div>
        }
      >
        <UserProfileContent params={props.params} />
      </Suspense>
    </div>
  );
}
