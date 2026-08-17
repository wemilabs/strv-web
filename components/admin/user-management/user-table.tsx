"use client";

import {
  Ban,
  CheckCircle,
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelativeTime, getInitials } from "@/lib/utils";

interface UserTableProps {
  users: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    lastLoginMethod?: string | null;
    createdAt: Date;
    updatedAt: Date;
    members?: Array<{
      organization: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
  }[];
  onUserUpdate: (
    userId: string,
    data: { name?: string; emailVerified?: boolean },
  ) => void;
  onUserDelete: (userId: string) => void;
}

export function UserTable({
  users,
  onUserUpdate,
  onUserDelete,
}: UserTableProps) {
  const [isPending, startTransition] = useTransition();

  const handleUserAction = (action: () => void) => {
    startTransition(() => {
      try {
        action();
      } catch (error: unknown) {
        const e = error as Error;
        console.error(`Failed to perform user action: ${e}`);
        toast.error("Failure", { description: e.message });
      }
    });
  };

  const getStatusBadge = (emailVerified: boolean) => {
    if (emailVerified) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Businesses</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      src={user.image || undefined}
                      alt={user.name}
                    />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground font-mono tracking-tighter">
                      {user.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(user.emailVerified)}</TableCell>
              <TableCell>
                <div className="text-sm">
                  {user.members && user.members.length > 0 ? (
                    <div className="space-y-1">
                      {user.members.slice(0, 2).map(member => (
                        <div key={member.organization.id} className="text-xs">
                          {member.organization.name}
                        </div>
                      ))}
                      {user.members.length > 2 && (
                        <div className="text-xs text-muted-foreground font-mono tracking-tighter">
                          +{user.members.length - 2} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground font-mono tracking-tighter">
                      None
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {formatRelativeTime(new Date(user.createdAt))}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground font-mono tracking-tighter">
                  {user.lastLoginMethod || "Email"}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="size-8 p-0">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 size-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleUserAction(() =>
                          onUserUpdate(user.id, { name: user.name }),
                        )
                      }
                      disabled={isPending}
                    >
                      <Edit className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.emailVerified ? (
                      <DropdownMenuItem
                        onClick={() =>
                          handleUserAction(() =>
                            onUserUpdate(user.id, { emailVerified: false }),
                          )
                        }
                        disabled={isPending}
                      >
                        <Ban className="mr-2 size-4" />
                        Unverify Email
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() =>
                          handleUserAction(() =>
                            onUserUpdate(user.id, { emailVerified: true }),
                          )
                        }
                        disabled={isPending}
                      >
                        <CheckCircle className="mr-2 size-4" />
                        Verify Email
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={e => e.preventDefault()}>
                          <Trash2 className="mr-2 size-4 text-red-600" />
                          <span className="text-red-600">Delete</span>
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. It will permanently
                            delete the user account and all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleUserAction(() => onUserDelete(user.id))
                            }
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isPending}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
