'use client';

import { useState, useEffect } from "react";
import { Search, Filter, Check, X, ArrowUpDown, MoreHorizontal, Users, CheckCircle, XCircle, Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import AdminTable from "@/components/admin-dashboard/AdminTable";
import { adminToast } from "@/lib/utils/adminToast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePaginatedUsers } from "@/hooks/usePaginatedUsers";
import UsersPagination from "@/components/admin-dashboard/UsersPagination";
import ViewListingsSection from "@/components/admin-dashboard/ViewListingsSection";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  /** Derived from is_suspended and status — use for suspend vs activate, not raw status === "active" */
  isSuspended?: boolean;
  /** Mirrors user_profiles.profile_complete (onboarding finished), not email verification */
  profileComplete: boolean;
  joined: string;
  listings: number;
  avatar: string;
  county: string;
  fraudFlags?: any;
  isSuspicious?: boolean;
}

interface AccountDeletionAuditRow {
  id: string;
  deleted_user_id: string;
  deleted_email: string | null;
  actor_user_id: string;
  actor_email: string | null;
  source: "self_service" | "admin";
  created_at: string;
}

const accountDeletionAuditTable = "account_deletion_audit" as any;

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPromoteHint, setShowPromoteHint] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFraud, setFilterFraud] = useState("all");
  const [fraudDialogUser, setFraudDialogUser] = useState<User | null>(null);
  const [deleteDialogUser, setDeleteDialogUser] = useState<User | null>(null);
  const [suspendDialogUser, setSuspendDialogUser] = useState<User | null>(null);
  const [promoteDialogUser, setPromoteDialogUser] = useState<User | null>(null);
  const [deletionAuditRows, setDeletionAuditRows] = useState<
    AccountDeletionAuditRow[]
  >([]);

  useEffect(() => {
    const q = searchParams.get("search") ?? searchParams.get("email") ?? "";
    if (q.trim()) {
      setSearchTerm(q.trim());
    }
    if (searchParams.get("promote") === "1") {
      setShowPromoteHint(true);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const loadAudit = async () => {
      const { data, error } = await supabase
        .from(accountDeletionAuditTable)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (cancelled) return;
      if (!error && Array.isArray(data)) {
        setDeletionAuditRows(data as unknown as AccountDeletionAuditRow[]);
      }
    };
    loadAudit();
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    users,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    error,
    goToPage,
    refreshUsers
  } = usePaginatedUsers({
    searchTerm,
    filterStatus,
    filterFraud,
    activeTab,
    pageSize: 8
  });

  const handleViewProfile = (user: User) => {
    router.push(`/users/${user.id}`);
  };

  const handleViewFraudDetails = (user: User) => {
    setFraudDialogUser(user);
  };

  const handleEditUser = (user: User) => {
    toast.info("User editing feature coming soon");
  };

  const handleSuspendUser = async (user: User) => {
    setSuspendDialogUser(user);
  };

  const confirmSuspendUser = async () => {
    if (!suspendDialogUser) return;

    try {
      const currentlySuspended = suspendDialogUser.isSuspended === true;
      const isSuspending = !currentlySuspended;
      const newStatus = isSuspending ? "suspended" : "active";
      
      // Prepare update object
      const updateData: any = {
        status: newStatus,
        is_suspended: isSuspending,
      };

      if (isSuspending) {
        // When suspending, set suspension details
        updateData.suspended_at = new Date().toISOString();
        updateData.suspended_by = currentUser?.id || null;
      } else {
        // When activating, clear suspension details
        updateData.suspended_at = null;
        updateData.suspended_by = null;
        updateData.suspension_reason = null;
      }
      
      // Update user status in database
      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', suspendDialogUser.id);

      if (error) throw error;

      toast.success(`User ${isSuspending ? "suspended" : "activated"} successfully`);
      
      // Refresh users list
      refreshUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    } finally {
      setSuspendDialogUser(null);
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeleteDialogUser(user);
  };

  const handlePromoteToAdmin = (user: User) => {
    setPromoteDialogUser(user);
  };

  const confirmPromoteToAdmin = async () => {
    if (!promoteDialogUser) return;

    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-create-admin",
        {
          body: { action: "promote", userId: promoteDialogUser.id },
        },
      );

      if (error) throw error;
      if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(String(data.error));
      }

      toast.success(`${promoteDialogUser.name} is now an administrator`);
      refreshUsers();
    } catch (err) {
      console.error("Promote to admin error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to promote user";
      toast.error(message);
    } finally {
      setPromoteDialogUser(null);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteDialogUser) return;

    try {
      const { data, error } = await supabase.functions.invoke(
        "delete-user-account",
        {
          body: { userId: deleteDialogUser.id },
        },
      );

      if (error) throw error;
      if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(String(data.error));
      }

      toast.success("User account deleted successfully");

      const { data: auditRefresh } = await supabase
        .from(accountDeletionAuditTable)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (auditRefresh) {
        setDeletionAuditRows(
          auditRefresh as unknown as AccountDeletionAuditRow[],
        );
      }

      // Refresh users list
      refreshUsers();
    } catch (error: unknown) {
      console.error("Error deleting user:", error);
      const message =
        error instanceof Error ? error.message : "Failed to delete user account";
      toast.error(message);
    } finally {
      setDeleteDialogUser(null);
    }
  };
  
  // Users are already filtered by the hook, so we can use them directly
  const filteredUsers = users;
  
  // Status badge renderer
  const getStatusBadge = (status: string) => {
    switch(status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Role badge renderer
  const getRoleBadge = (role: string) => {
    switch(role) {
      case "admin":
        return <Badge className="bg-blue-600">Admin</Badge>;
      case "seller":
        return <Badge className="bg-green-600">Seller</Badge>;
      case "buyer":
        return <Badge variant="secondary">Buyer</Badge>;
      case "business":
        return <Badge className="bg-amber-600">Business</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold">User Management</h2>
        </div>
        <div className="py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-center text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold">User Management</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-red-500">Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 w-full max-w-full" style={{ overflowX: 'hidden', boxSizing: 'border-box' }}>
      {showPromoteHint && (
        <div className="rounded-md border border-brand-light-green/40 bg-brand-light-green/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-brand-dark-green">
            Find the user below (search is pre-filled). Open the{" "}
            <span className="font-medium">⋮</span> menu on their row and choose{" "}
            <span className="font-medium">Promote to admin</span>.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-brand-dark-green hover:text-brand-dark-green"
            onClick={() => {
              setShowPromoteHint(false);
              router.replace("/admin-dashboard/users");
            }}
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">User Management</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="text-xs sm:text-sm text-gray-600">
            Total users: {totalCount}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="text-xs sm:text-sm">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
            <Button variant="default" size="sm" className="text-xs sm:text-sm" asChild>
              <Link href="/admin-dashboard/admins">
                <Shield className="w-4 h-4 mr-2" />
                Create Admin
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 w-full max-w-full">
        <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex md:grid md:grid-cols-5 lg:w-[600px] bg-gray-100 p-1 rounded-lg w-max md:w-full">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium whitespace-nowrap px-4 md:px-3 text-xs sm:text-sm"
              >
                All Users
              </TabsTrigger>
              <TabsTrigger
                value="buyer"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium whitespace-nowrap px-4 md:px-3 text-xs sm:text-sm"
              >
                Buyers
              </TabsTrigger>
              <TabsTrigger
                value="seller"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium whitespace-nowrap px-4 md:px-3 text-xs sm:text-sm"
              >
                Sellers
              </TabsTrigger>
              <TabsTrigger
                value="business"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium whitespace-nowrap px-4 md:px-3 text-xs sm:text-sm"
              >
                Businesses
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium whitespace-nowrap px-4 md:px-3 text-xs sm:text-sm"
              >
                Admins
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 border-border bg-background focus:ring-2 focus:ring-brand-light-green focus:border-brand-light-green transition-colors"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px] h-10 border-border bg-background focus:ring-2 focus:ring-brand-light-green focus:border-brand-light-green">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="all" className="hover:bg-brand-light-green/10">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All Statuses
                  </div>
                </SelectItem>
                <SelectItem value="active" className="hover:bg-brand-light-green/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Active
                  </div>
                </SelectItem>
                <SelectItem value="suspended" className="hover:bg-brand-light-green/10">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-600" />
                    Suspended
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFraud} onValueChange={setFilterFraud}>
              <SelectTrigger className="w-full md:w-[200px] h-10 border-border bg-background focus:ring-2 focus:ring-brand-light-green focus:border-brand-light-green">
                <AlertTriangle className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter by fraud" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="all" className="hover:bg-brand-light-green/10">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All Users
                  </div>
                </SelectItem>
                <SelectItem value="suspicious" className="hover:bg-brand-light-green/10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Suspicious
                  </div>
                </SelectItem>
                <SelectItem value="clean" className="hover:bg-brand-light-green/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Clean
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <TabsContent value="all" className="mt-6 space-y-4">
            <UsersTable 
              users={filteredUsers} 
              getStatusBadge={getStatusBadge} 
              getRoleBadge={getRoleBadge}
              onViewProfile={handleViewProfile}
              onViewFraudDetails={handleViewFraudDetails}
              onEditUser={handleEditUser}
              onSuspendUser={handleSuspendUser}
              onDeleteUser={handleDeleteUser}
              onPromoteToAdmin={handlePromoteToAdmin}
            />
            {users.length > 0 && (
              <UsersPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={8}
                onPageChange={goToPage}
              />
            )}
          </TabsContent>
          <TabsContent value="buyer" className="mt-6 space-y-4">
            <UsersTable 
              users={filteredUsers} 
              getStatusBadge={getStatusBadge} 
              getRoleBadge={getRoleBadge}
              onViewProfile={handleViewProfile}
              onViewFraudDetails={handleViewFraudDetails}
              onEditUser={handleEditUser}
              onSuspendUser={handleSuspendUser}
              onDeleteUser={handleDeleteUser}
              onPromoteToAdmin={handlePromoteToAdmin}
            />
            {users.length > 0 && (
              <UsersPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={8}
                onPageChange={goToPage}
              />
            )}
          </TabsContent>
          <TabsContent value="seller" className="mt-6 space-y-4">
            <UsersTable 
              users={filteredUsers} 
              getStatusBadge={getStatusBadge} 
              getRoleBadge={getRoleBadge}
              onViewProfile={handleViewProfile}
              onViewFraudDetails={handleViewFraudDetails}
              onEditUser={handleEditUser}
              onSuspendUser={handleSuspendUser}
              onDeleteUser={handleDeleteUser}
              onPromoteToAdmin={handlePromoteToAdmin}
            />
            {users.length > 0 && (
              <UsersPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={8}
                onPageChange={goToPage}
              />
            )}
          </TabsContent>
          <TabsContent value="business" className="mt-6 space-y-4">
            <UsersTable 
              users={filteredUsers} 
              getStatusBadge={getStatusBadge} 
              getRoleBadge={getRoleBadge}
              onViewProfile={handleViewProfile}
              onViewFraudDetails={handleViewFraudDetails}
              onEditUser={handleEditUser}
              onSuspendUser={handleSuspendUser}
              onDeleteUser={handleDeleteUser}
              onPromoteToAdmin={handlePromoteToAdmin}
            />
            {users.length > 0 && (
              <UsersPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={8}
                onPageChange={goToPage}
              />
            )}
          </TabsContent>
          <TabsContent value="admin" className="mt-6 space-y-4">
            <UsersTable 
              users={filteredUsers} 
              getStatusBadge={getStatusBadge} 
              getRoleBadge={getRoleBadge}
              onViewProfile={handleViewProfile}
              onViewFraudDetails={handleViewFraudDetails}
              onEditUser={handleEditUser}
              onSuspendUser={handleSuspendUser}
              onDeleteUser={handleDeleteUser}
              onPromoteToAdmin={handlePromoteToAdmin}
            />
            {users.length > 0 && (
              <UsersPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={8}
                onPageChange={goToPage}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold">Recent account deletions</h3>
            <p className="text-xs text-muted-foreground max-w-xl">
              Logged when someone uses account settings or an admin deletes a user
              (covers &quot;my account vanished&quot; support—check actor and time).
            </p>
          </div>
          {deletionAuditRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No deletion events recorded yet, or the audit table is not migrated.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">When (UTC)</TableHead>
                    <TableHead>Deleted email</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="hidden lg:table-cell">Actor</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-mono">
                      User id
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletionAuditRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(row.created_at).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.deleted_email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {row.source === "admin" ? "Admin" : "Self-service"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {row.actor_email ?? row.actor_user_id.slice(0, 8) + "…"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-mono">
                        {row.deleted_user_id}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ViewListingsSection />

      {/* Fraud Details Dialog */}
      <Dialog open={!!fraudDialogUser} onOpenChange={() => setFraudDialogUser(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fraud Detection Details</DialogTitle>
            <DialogDescription>
              Security flags for {fraudDialogUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Fraud Status</h4>
              {fraudDialogUser?.isSuspicious ? (
                <Badge variant="destructive">Suspicious Activity Detected</Badge>
              ) : (
                <Badge variant="default">No Suspicious Activity</Badge>
              )}
            </div>
            {fraudDialogUser?.fraudFlags?.flags && (
              <div>
                <h4 className="font-semibold mb-2">Flags</h4>
                <ul className="list-disc list-inside space-y-1">
                  {Array.isArray(fraudDialogUser.fraudFlags.flags) && 
                    fraudDialogUser.fraudFlags.flags.map((flag: string, idx: number) => (
                      <li key={idx} className="text-sm text-orange-600">{flag}</li>
                    ))
                  }
                </ul>
              </div>
            )}
            {fraudDialogUser?.fraudFlags?.analyzed_at && (
              <div>
                <h4 className="font-semibold mb-2">Analysis Date</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(fraudDialogUser.fraudFlags.analyzed_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setFraudDialogUser(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend User Dialog */}
      <AlertDialog open={!!suspendDialogUser} onOpenChange={() => setSuspendDialogUser(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendDialogUser?.isSuspended ? "Activate" : "Suspend"} User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {suspendDialogUser?.isSuspended ? "activate" : "suspend"}{" "}
              {suspendDialogUser?.name}? {suspendDialogUser?.isSuspended
                ? "They will regain access to their account."
                : "They will not be able to access their account."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSuspendUser}>
              {suspendDialogUser?.isSuspended ? "Activate" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote to Admin Dialog */}
      <AlertDialog open={!!promoteDialogUser} onOpenChange={() => setPromoteDialogUser(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to administrator</AlertDialogTitle>
            <AlertDialogDescription>
              Grant {promoteDialogUser?.name} full admin access to the platform? They
              will be able to sign in and use the admin dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPromoteToAdmin}>
              Promote to admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={!!deleteDialogUser} onOpenChange={() => setDeleteDialogUser(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {deleteDialogUser?.name}'s account? 
              This action cannot be undone and will remove all their data, listings, and messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Extracted Users Table component
const UsersTable = ({ 
  users, 
  getStatusBadge, 
  getRoleBadge,
  onViewProfile,
  onViewFraudDetails,
  onEditUser,
  onSuspendUser,
  onDeleteUser,
  onPromoteToAdmin,
}: { 
  users: User[], 
  getStatusBadge: (status: string) => React.ReactNode,
  getRoleBadge: (role: string) => React.ReactNode,
  onViewProfile: (user: User) => void,
  onViewFraudDetails: (user: User) => void,
  onEditUser: (user: User) => void,
  onSuspendUser: (user: User) => void,
  onDeleteUser: (user: User) => void,
  onPromoteToAdmin: (user: User) => void,
}) => {
  const columns = [
    { key: "id", label: "ID", width: "w-[80px]", render: (value: string) => value.substring(0, 8) + "..." },
    { 
      key: "user", 
      label: "User", 
      render: (value: any, row: User) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.avatar} alt={row.name} />
            <AvatarFallback>{row.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span>{row.name}</span>
              {row.isSuspicious && (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
            </div>
            {row.isSuspicious && row.fraudFlags?.flags && (
              <div className="text-xs text-orange-600 mt-1">
                {Array.isArray(row.fraudFlags.flags) ? row.fraudFlags.flags.slice(0, 2).join(", ") : "Flagged"}
                {Array.isArray(row.fraudFlags.flags) && row.fraudFlags.flags.length > 2 && "..."}
              </div>
            )}
          </div>
        </div>
      )
    },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: (value: string) => getRoleBadge(value) },
    { key: "status", label: "Status", render: (value: string) => getStatusBadge(value) },
    { 
      key: "fraudFlags", 
      label: "Security", 
      render: (value: any, row: User) => {
        if (row.isSuspicious) {
          return (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Flagged
            </Badge>
          );
        }
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Clean
          </Badge>
        );
      }
    },
    { key: "county", label: "County" },
    { key: "joined", label: "Joined" },
    { 
      key: "profileComplete", 
      label: "Profile", 
      render: (value: boolean) => (
        <span
          title="Onboarding / profile wizard completed (profile_complete). This is not the same as email verification."
          className="inline-flex cursor-help"
        >
          {value ? (
            <Badge variant="default">Complete</Badge>
          ) : (
            <Badge variant="secondary">Incomplete</Badge>
          )}
        </span>
      ),
    },
    { key: "listings", label: "Listings" }
  ];

  const actions = [
    { label: "View Profile", onClick: onViewProfile },
    { label: "View Fraud Details", onClick: onViewFraudDetails, condition: (user: User) => !!user.isSuspicious },
    { label: "Edit User", onClick: onEditUser },
    {
      label: "Promote to admin",
      onClick: onPromoteToAdmin,
      condition: (user: User) => user.role !== "admin",
    },
    { 
      label: "Suspend or reactivate user",
      onClick: onSuspendUser,
      variant: "secondary" as const,
      separator: true
    },
    { 
      label: "Delete Account", 
      onClick: onDeleteUser,
      variant: "destructive" as const,
      separator: true
    }
  ];

  return <AdminTable data={users} columns={columns} actions={actions} emptyMessage="No users have registered yet. Users will appear here once they create accounts and complete their profiles." />;
};




























