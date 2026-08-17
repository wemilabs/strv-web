"use client";

import { AlertTriangle, RotateCcw, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  deleteUser,
  useActiveOrganization,
  useListOrganizations,
} from "@/lib/auth-client";
import { resetAllData } from "@/server/account";
import { Spinner } from "../ui/spinner";

interface DangerZoneProps {
  userId: string;
}

export function DangerZone({ userId }: DangerZoneProps) {
  const router = useRouter();

  const { refetch: refetchActiveStore } = useActiveOrganization();
  const { refetch: refetchStores } = useListOrganizations();

  const [resetState, resetFormAction, isResetting] = useActionState(
    resetAllData,
    {
      success: false,
      error: null,
    },
  );
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const [isDeletingUserAccount, startDeleteUserAccountTransition] =
    useTransition();
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <div className="border border-red-200 rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-red-600" />
        <h2 className="text-lg font-medium text-red-600">Danger Zone</h2>
      </div>

      <div className="space-y-6">
        {/* Reset All Data */}
        <div className="border border-orange-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="size-4 text-orange-600" />
            <h3 className="text-base font-medium text-orange-600">
              Reset All Data
            </h3>
          </div>

          <p className="text-sm text-muted-foreground font-mono tracking-tighter text-pretty">
            Clear all data from your stores while keeping your account. This
            will remove:
          </p>

          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside font-mono tracking-tighter text-pretty">
            <li>All products and inventory</li>
            <li>Order history and analytics</li>
            <li>Store settings and metadata</li>
            <li>Customer data</li>
          </ul>

          <p className="text-sm text-orange-600 font-medium">
            Your account will remain active, but you'll need to set up your
            stores again.
          </p>

          <AlertDialog
            open={resetDialogOpen && !resetState.success}
            onOpenChange={open => {
              if (!isResetting) {
                setResetDialogOpen(open);
                if (!open) setResetConfirmText("");
              }
            }}
          >
            <AlertDialogTrigger className="py-2 px-2.5 rounded-md text-sm bg-orange-600 hover:bg-orange-600/80 flex-1 text-white">
              Reset All Data
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-orange-600">
                  Reset All Data
                </AlertDialogTitle>
                <AlertDialogDescription className="font-mono tracking-tighter text-pretty">
                  This will remove all your store data but keep your account
                  active. You can set up new stores afterward.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    To confirm, type "RESET" in the box below:
                  </p>
                  <Input
                    value={resetConfirmText}
                    onChange={e => setResetConfirmText(e.target.value)}
                    placeholder="Type RESET to confirm"
                    className="w-full placeholder:text-sm"
                  />
                </div>
              </div>

              <form
                action={formData => {
                  resetFormAction(formData);
                  refetchActiveStore();
                  refetchStores();
                }}
              >
                <input type="hidden" name="userId" value={userId} />
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isResetting}>
                    Cancel
                  </AlertDialogCancel>
                  <button
                    className="py-2 px-2.5 rounded-md text-sm bg-orange-600 hover:bg-orange-600/80 text-white disabled:opacity-50"
                    type="submit"
                    disabled={isResetting || resetConfirmText !== "RESET"}
                  >
                    {isResetting ? (
                      <div className="flex items-center justify-center gap-2">
                        <Spinner />
                        Resetting...
                      </div>
                    ) : (
                      "Reset All Data"
                    )}
                  </button>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>

          {resetState.error && (
            <p className="text-sm text-red-600">{resetState.error}</p>
          )}

          {resetState.success && (
            <p className="text-sm text-green-600">
              All data has been reset successfully!
            </p>
          )}
        </div>

        {/* Delete Account */}
        <div className="border border-red-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <UserX className="size-4 text-red-600" />
            <h3 className="text-base font-medium text-red-600">
              Delete Account
            </h3>
          </div>

          <p className="text-sm text-muted-foreground font-mono tracking-tighter text-pretty">
            Permanently delete your account and all associated data. This action
            cannot be undone and will remove:
          </p>

          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside font-mono tracking-tighter text-pretty">
            <li>Your user account and profile</li>
            <li>All stores and organizations</li>
            <li>All products, orders, and analytics</li>
            <li>All settings and preferences</li>
          </ul>

          <p className="text-sm text-red-600 font-medium">
            This is permanent and cannot be recovered.
          </p>

          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={open => {
              if (!isDeletingUserAccount) {
                setDeleteDialogOpen(open);
                if (!open) setDeleteConfirmText("");
              }
            }}
          >
            <AlertDialogTrigger className="py-2 px-2.5 rounded-md text-sm bg-red-600 hover:bg-red-600/80 flex-1 text-white">
              Delete Account
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-600">
                  Delete Account
                </AlertDialogTitle>
                <AlertDialogDescription className="font-mono tracking-tighter text-pretty">
                  This will permanently delete your account and all associated
                  data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    To confirm deletion, type "DELETE" in the box below:
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full placeholder:text-sm"
                  />
                </div>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (
                    deleteConfirmText === "DELETE" &&
                    !isDeletingUserAccount
                  ) {
                    startDeleteUserAccountTransition(async () => {
                      try {
                        await deleteUser({
                          callbackURL: "/",
                        });
                        refetchActiveStore();
                        refetchStores();
                        setDeleteDialogOpen(false);
                        setDeleteConfirmText("");
                        router.push("/");
                        router.refresh();
                      } catch (error: unknown) {
                        const e = error as Error;
                        console.error(e.message);
                        toast.error("Account deletion failed", {
                          description:
                            "Something went wrong. Please try again later.",
                        });
                      }
                    });
                  }
                }}
              >
                <input type="hidden" name="userId" value={userId} />
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingUserAccount}>
                    Cancel
                  </AlertDialogCancel>
                  <button
                    className="py-2 px-2.5 rounded-md text-sm bg-red-600 hover:bg-red-600/80 text-white disabled:opacity-50"
                    type="submit"
                    disabled={
                      isDeletingUserAccount || deleteConfirmText !== "DELETE"
                    }
                  >
                    {isDeletingUserAccount ? (
                      <div className="flex items-center justify-center gap-2">
                        <Spinner />
                        Deleting...
                      </div>
                    ) : (
                      "Delete Account"
                    )}
                  </button>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
