"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  organization,
  useActiveOrganization,
  useListOrganizations,
  useSession,
} from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { RegisterStoreForm } from "./forms/register-store-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";

export function StoreSwitcher() {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: stores, isPending: storesPending } = useListOrganizations();
  const { isMobile } = useSidebar();
  const { data: activeStore, isPending: activeStorePending } =
    useActiveOrganization();
  const { data: session, isPending: sessionPending } = useSession();

  const router = useRouter();

  const isLoading = storesPending || activeStorePending || sessionPending;

  const userId = session?.session?.userId;

  const handleStoreChange = async (
    e: React.MouseEvent<HTMLAnchorElement>,
    organizationId: string,
    organizationSlug: string,
  ) => {
    e.preventDefault();
    try {
      await organization.setActive({
        organizationId,
        organizationSlug,
      });
      setOpen(false);
      router.refresh();
      toast.success("Done!", {
        description: "Store has been successfully set.",
      });
    } catch (error) {
      console.error("Error setting store:", error);
      toast.error("Error", {
        description: "Failed to set store.",
      });
    }
  };

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:mt-4">
      <SidebarMenuItem>
        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <Popover onOpenChange={setOpen} open={open}>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                aria-expanded={open}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground justify-between"
                role="combobox"
                size="lg"
              >
                {(() => {
                  return (
                    <div className="flex w-full items-center gap-2">
                      <Avatar className="size-6 -ml-1 group-data-[collapsible=icon]:mx-auto">
                        <AvatarImage
                          alt={activeStore?.name ?? "Store logo"}
                          src={
                            (activeStore?.logo as string | undefined) ??
                            undefined
                          }
                        />
                        <AvatarFallback>
                          {(activeStore?.name ?? "B").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        {activeStore?.name ?? "Activate store..."}
                      </span>
                      <ChevronsUpDown className="ml-auto opacity-50 group-data-[collapsible=icon]:hidden size-4" />
                    </div>
                  );
                })()}
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg p-1"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <Command>
                <CommandInput className="h-9" placeholder="Search store..." />
                <CommandList>
                  <CommandEmpty>No stores found.</CommandEmpty>
                  <CommandGroup>
                    {userId &&
                      stores?.map((store, index) => (
                        <Link
                          href={`/stores/${store.slug}`}
                          key={store.id}
                          onClick={e =>
                            handleStoreChange(e, store.id, store.slug)
                          }
                        >
                          <CommandItem
                            className="py-2.5 cursor-pointer"
                            value={store.name}
                          >
                            <div className="flex w-full items-center gap-2">
                              <Avatar className="size-6 rounded-lg">
                                <AvatarImage
                                  alt={store.name}
                                  src={
                                    (store.logo as string | undefined) ??
                                    undefined
                                  }
                                />
                                <AvatarFallback>
                                  {store.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{store.name}</span>
                              <Check
                                className={cn(
                                  "ml-auto",
                                  activeStore?.id === store.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />

                              <span className="text-muted-foreground text-xs">
                                ⌘{index + 1}
                              </span>
                            </div>
                          </CommandItem>
                        </Link>
                      ))}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem className="pt-1.5 pb-0 px-0">
                      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
                        <DialogTrigger
                          className="flex items-start gap-2 px-2 py-1.5"
                          onClick={() => setDialogOpen(true)}
                        >
                          <div className="border rounded-md p-1 -mt-0.5">
                            <Plus className="size-4" />
                          </div>
                          Add store
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader className="mb-2">
                            <DialogTitle>Register Store</DialogTitle>
                            <DialogDescription className="font-mono tracking-tighter">
                              Register a new store to get started.
                            </DialogDescription>
                          </DialogHeader>
                          <RegisterStoreForm
                            onSuccess={() => setDialogOpen(false)}
                            onCloseDialog={() => setDialogOpen(false)}
                          />
                        </DialogContent>
                      </Dialog>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
