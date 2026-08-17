"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { Activity } from "react";
import { toast } from "sonner";
import { UserStatsCards } from "@/components/admin/user-management/user-stats-cards";
import { UserTable } from "@/components/admin/user-management/user-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserMetrics } from "@/server/admin/user-metrics";
import {
  deleteUserAdmin,
  getAllUsersAdmin,
  getUserStatsAdmin,
  updateUserAdmin,
} from "@/server/users";
import { UserMetrics } from "./user-metrics";

const statusOptions = ["all", "active", "inactive"] as const;

export function AdminUserManagement() {
  const queryClient = useQueryClient();

  const [{ search, status, page }, setFilters] = useQueryStates(
    {
      search: { defaultValue: "", parse: v => v || "" },
      status: parseAsStringLiteral(statusOptions).withDefault("all"),
      page: parseAsInteger.withDefault(1),
    },
    {
      shallow: true,
      throttleMs: 300,
    },
  );

  const {
    data: usersData,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["admin-users", page, search, status],
    queryFn: () =>
      getAllUsersAdmin({
        page,
        limit: 20,
        search: search || undefined,
        status: status === "all" ? undefined : status,
      }),
  });

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getUserStatsAdmin(),
  });

  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => getUserMetrics(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: { name?: string; emailVerified?: boolean };
    }) => updateUserAdmin(userId, data),
    onSuccess: result => {
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      } else {
        toast.error(result.message);
      }
    },
    onError: error => {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUserAdmin,
    onSuccess: result => {
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      } else {
        toast.error(result.message);
      }
    },
    onError: error => {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    },
  });

  const handleUserUpdate = (
    userId: string,
    data: { name?: string; emailVerified?: boolean },
  ) => {
    updateUserMutation.mutate({ userId, data });
  };

  const handleUserDelete = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  const refreshData = () => {
    refetchUsers();
    refetchStats();
    refetchMetrics();
  };

  const handleExport = () => {
    const csvContent = [
      ["Name", "Email", "Status", "Joined", "Businesses"].join(","),
      ...(usersData?.users || []).map(user =>
        [
          user.name,
          user.email,
          user.emailVerified ? "Active" : "Inactive",
          new Date(user.createdAt).toLocaleDateString(),
          user.members?.length || 0,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${
      new Date().toISOString().split("T")[0]
    }-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const isLoading = usersLoading || statsLoading || metricsLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">User Management</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            <RefreshCw
              className={`size-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:block">Refresh</span>
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="size-4" />
            <span className="hidden sm:block">Export</span>
          </Button>
          <Button onClick={() => alert("Coming soon!")}>
            <Plus className="size-4" />
            <span className="hidden sm:block">Add User</span>
          </Button>
        </div>
      </div>

      <UserStatsCards
        stats={stats || { total: 0, active: 0, inactive: 0, newToday: 0 }}
      />

      {metrics && <UserMetrics metrics={metrics} />}

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search users or businesses..."
                value={search}
                onChange={e => setFilters({ search: e.target.value, page: 1 })}
                className="px-8 placeholder:text-sm text-sm"
              />
              <Activity mode={search ? "visible" : "hidden"}>
                <button
                  type="button"
                  onClick={() => setFilters({ search: "", page: 1 })}
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </Activity>
            </div>
            <Select
              value={status}
              onValueChange={(value: "all" | "active" | "inactive") =>
                setFilters({ status: value, page: 1 })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="size-4 animate-spin" />
              <span className="ml-2 text-sm">Loading users...</span>
            </div>
          ) : !usersData?.users || usersData.users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm font-mono tracking-tighter">
                No users found
              </p>
            </div>
          ) : (
            <>
              <UserTable
                users={usersData.users}
                onUserUpdate={handleUserUpdate}
                onUserDelete={handleUserDelete}
              />

              {(usersData.pagination.pages || 0) > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {usersData.pagination.pages || 0}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ page: page - 1 })}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ page: page + 1 })}
                      disabled={page === (usersData.pagination.pages || 0)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
