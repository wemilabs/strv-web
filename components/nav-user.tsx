"use client";

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  signOut,
  useActiveOrganization,
  useListOrganizations,
} from "@/lib/auth-client";
import { getInitials } from "@/lib/utils";
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
} from "./ui/alert-dialog";
import { Spinner } from "./ui/spinner";

export function NavUser({
  user,
}: {
  user:
    | {
        id: string;
        email: string;
        emailVerified: boolean;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        image?: string | null | undefined;
      }
    | undefined;
}) {
  const { isMobile } = useSidebar();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSigningOutPending, startSigningOutTransition] = useTransition();

  const router = useRouter();

  const { refetch: refetchActiveStore } = useActiveOrganization();
  const { refetch: refetchStores } = useListOrganizations();

  const handleSignOut = () => {
    startSigningOutTransition(async () => {
      try {
        await signOut({
          fetchOptions: {
            onSuccess: async () => {
              refetchActiveStore();
              refetchStores();
              toast.success("Success", {
                description: "Successfully signed out. See you soon!",
              });
              setIsDialogOpen(false);
              router.push("/");
              router.refresh();
            },
          },
        });
      } catch (error: unknown) {
        const e = error as Error;
        console.error("Sign out error:", e.message);
        toast.error("Failure", {
          description: e.message || "Failed to sign out",
        });
        setIsDialogOpen(false);
      }
    });
  };

  const userInitials = user?.name ? getInitials(user.name) : "?";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <Avatar className="size-8 rounded-lg">
                {user?.image ? (
                  <AvatarImage alt={user?.name} src={user?.image} />
                ) : (
                  <AvatarFallback className="rounded-lg">
                    {userInitials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.name}</span>
                <span className="truncate text-xs">{user?.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {/* Once we click on it, we should open other accounts to switch between them */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  {user?.image ? (
                    <AvatarImage alt={user?.name} src={user?.image} />
                  ) : (
                    <AvatarFallback className="rounded-lg">
                      {userInitials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href="/usage/pricing">
                <DropdownMenuItem>
                  <Sparkles />
                  Upgrade Plan
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href={`/users/${user?.id}`}>
                <DropdownMenuItem>
                  <BadgeCheck />
                  Account
                </DropdownMenuItem>
              </Link>
              <Link href="/usage/billing">
                <DropdownMenuItem>
                  <CreditCard />
                  Billing
                </DropdownMenuItem>
              </Link>
              <Link href="#">
                <DropdownMenuItem>
                  <Bell />
                  Notifications
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <AlertDialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
              <AlertDialogTrigger className="flex items-center gap-2 py-1 text-left text-sm hover:bg-sidebar-accent w-full">
                <LogOut className="size-4 ml-2 text-accent-foreground/70" />
                Sign out
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="font-mono tracking-tighter">
                    This action cannot be undone. It will sign you out of your
                    account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isSigningOutPending}
                    onClick={e => {
                      e.preventDefault();
                      handleSignOut();
                    }}
                  >
                    {isSigningOutPending ? (
                      <div className="flex items-center gap-2">
                        <Spinner />
                        Signing out...
                      </div>
                    ) : (
                      "Continue"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
