"use client";

import { Package, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, useState, useTransition } from "react";
import { toast } from "sonner";

import { OrganizationFollowButton } from "@/components/follows/organization-follow-button";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Organization } from "@/db/schema";
import { getInitials } from "@/lib/utils";
import { deleteStore } from "@/server/stores";
import { Spinner } from "../ui/spinner";

type StoreCardProps = {
  store: Organization;
  followersCount?: number;
  productsCount?: number;
  isFollowing?: boolean;
  showFollowButton?: boolean;
};

export function StoreCard({
  store,
  followersCount = 0,
  productsCount = 0,
  isFollowing = false,
  showFollowButton = true,
}: StoreCardProps) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteStore(store.id);
        setOpen(false);
        toast.success("Store deleted", {
          description: `${store.name} has been successfully deleted.`,
        });
      } catch (error) {
        console.error("Error deleting store:", error);
        toast.error("Failed to delete store", {
          description: "Please try again later.",
        });
      }
    });
  };

  const metadata = store.metadata
    ? (JSON.parse(store.metadata) as {
        description?: string;
        followersCount?: number;
      })
    : null;

  const displayFollowersCount = followersCount || metadata?.followersCount || 0;
  const isMerchantPage = pathname.startsWith("/merchants");

  return (
    <Card className="group transition-all hover:shadow-lg hover:border-primary/50">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="size-14 ring-2 ring-border transition-all group-hover:ring-primary/50">
            <AvatarImage alt={store.name} src={store.logo ?? ""} />
            <AvatarFallback className="bg-linear-to-br from-primary to-red-500 text-white text-base font-semibold">
              {getInitials(store.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <Link
              className="block hover:opacity-80 transition-opacity"
              href={
                isMerchantPage
                  ? `/merchants/${store.slug}`
                  : `/stores/${store.slug}`
              }
            >
              <CardTitle className="truncate md:text-lg mb-2">
                {store.name}
              </CardTitle>
              <CardDescription className="line-clamp-2 text-xs sm:text-sm font-mono tracking-tighter">
                {metadata?.description || "No description provided"}
              </CardDescription>
            </Link>
          </div>
        </div>

        <Activity mode={isMerchantPage ? "hidden" : "visible"}>
          <CardAction>
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all md:opacity-0 md:group-hover:opacity-100"
                  disabled={isPending}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="size-4 text-destructive" />
                  <span className="sr-only">Delete {store.name}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {store.name}?</AlertDialogTitle>
                  <AlertDialogDescription className="font-mono tracking-tighter">
                    This action cannot be undone. This will permanently delete
                    the store and remove all associated data including products,
                    members, and settings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={isPending}
                    onClick={e => {
                      e.preventDefault();
                      handleDelete();
                    }}
                  >
                    {isPending ? (
                      <>
                        <Spinner /> Deleting...
                      </>
                    ) : (
                      "Yes, delete"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardAction>
        </Activity>
      </CardHeader>
      <CardFooter className="flex items-center justify-between gap-3 pt-3 border-t">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="size-4" />
            <span>{displayFollowersCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="size-4" />
            <span>{productsCount}</span>
          </div>
        </div>
        <Activity
          mode={showFollowButton && isMerchantPage ? "visible" : "hidden"}
        >
          <OrganizationFollowButton
            organizationId={store.id}
            initialIsFollowing={isFollowing}
            initialFollowersCount={displayFollowersCount}
            revalidateTargetPath={pathname}
          />
        </Activity>
      </CardFooter>
    </Card>
  );
}
