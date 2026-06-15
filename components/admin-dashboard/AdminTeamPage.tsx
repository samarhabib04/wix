'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, UserPlus, RefreshCw, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  type ExistingUserForPromote,
  formatUserRoleLabel,
  parseAdminCreateAdminResponse,
} from "@/lib/utils/admin-create-admin-response";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string | null;
}

async function lookupExistingUserForPromote(
  email: string,
): Promise<ExistingUserForPromote | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, role, is_admin, first_name, last_name")
    .eq("email", normalized)
    .maybeSingle();

  if (error || !data) return null;
  if (data.role === "admin" || data.is_admin === true) return null;

  const displayName = [data.first_name, data.last_name]
    .filter((s) => typeof s === "string" && s.trim())
    .join(" ")
    .trim();

  return {
    userId: data.id,
    email: data.email ?? normalized,
    role: data.role ?? "buyer",
    displayName: displayName || null,
  };
}

export default function AdminTeamPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [existingUserNotice, setExistingUserNotice] =
    useState<ExistingUserForPromote | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, email, first_name, last_name, created_at")
        .or("role.eq.admin,is_admin.eq.true")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAdmins((data ?? []) as AdminUser[]);
    } catch (err) {
      console.error("Failed to load admins:", err);
      toast.error("Failed to load admin team");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const resetForm = () => {
    setForm({ email: "", password: "", firstName: "", lastName: "" });
    setShowPassword(false);
    setExistingUserNotice(null);
  };

  const goToPromoteUser = (email: string) => {
    setDialogOpen(false);
    resetForm();
    router.push(
      `/admin-dashboard/users?search=${encodeURIComponent(email.trim())}&promote=1`,
    );
  };

  const showExistingUserNotice = (user: ExistingUserForPromote) => {
    setExistingUserNotice(user);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setExistingUserNotice(null);

    if (!form.email.trim() || !form.password) {
      toast.error("Email and password are required");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-create-admin",
        {
          body: {
            action: "create",
            email: form.email.trim(),
            password: form.password,
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
          },
        },
      );

      if (error) {
        const fallback = await lookupExistingUserForPromote(form.email.trim());
        if (fallback) {
          showExistingUserNotice(fallback);
          return;
        }
        throw error;
      }

      const parsed = parseAdminCreateAdminResponse(data);

      if (parsed?.code === "USER_EXISTS" && parsed.existingUser) {
        showExistingUserNotice(parsed.existingUser);
        return;
      }

      if (
        parsed?.error &&
        /already exists|already registered/i.test(parsed.error)
      ) {
        const fallback = await lookupExistingUserForPromote(form.email.trim());
        if (fallback) {
          showExistingUserNotice(fallback);
          return;
        }
      }

      if (parsed?.code === "ALREADY_ADMIN") {
        toast.error(
          parsed.error ?? "This email already belongs to an administrator.",
        );
        return;
      }

      if (parsed?.ok === false) {
        throw new Error(
          parsed.error ?? parsed.message ?? "Could not create administrator",
        );
      }

      if (parsed?.error) {
        throw new Error(parsed.error);
      }

      toast.success(`Admin account created for ${form.email.trim()}`);
      setDialogOpen(false);
      resetForm();
      await loadAdmins();
    } catch (err) {
      console.error("Create admin error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to create admin";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = (admin: AdminUser) => {
    const parts = [admin.first_name, admin.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  };

  const initials = (admin: AdminUser) => {
    const f = admin.first_name?.[0] ?? admin.email[0] ?? "?";
    const l = admin.last_name?.[0] ?? "";
    return (f + l).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-brand-dark-green" />
            Admin Team
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create new administrators or view existing admin accounts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAdmins()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Admin
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current administrators</CardTitle>
          <CardDescription>
            {admins.length} admin{admins.length === 1 ? "" : "s"} with platform access.
            To promote an existing user, use{" "}
            <Link href="/admin-dashboard/users" className="text-brand-dark-green underline">
              User Management
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Loading admin team…
            </p>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No administrators found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {initials(admin)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{displayName(admin)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      {admin.created_at
                        ? new Date(admin.created_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateAdmin}>
            <DialogHeader>
              <DialogTitle>Create administrator</DialogTitle>
              <DialogDescription>
                For someone who has never signed up, enter their email and a
                temporary password. If they already have an account, use User
                Management to promote them.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {existingUserNotice && (
                <div
                  className="rounded-md border border-amber-200 bg-amber-50 p-4 space-y-3 text-sm"
                  role="alert"
                >
                  <p className="font-medium text-amber-950">
                    This user already has an account
                  </p>
                  <p className="text-amber-900">
                    You cannot create a second account for{" "}
                    <span className="font-medium">{existingUserNotice.email}</span>.
                    Go to User Management and use{" "}
                    <span className="font-medium">Promote to admin</span> on their row.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {existingUserNotice.displayName ||
                        existingUserNotice.email}
                    </Badge>
                    <Badge variant="outline">
                      {formatUserRoleLabel(existingUserNotice.role)}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() =>
                      goToPromoteUser(existingUserNotice.email)
                    }
                  >
                    Go to User Management to promote
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-first-name">First name</Label>
                  <Input
                    id="admin-first-name"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-last-name">Last name</Label>
                  <Input
                    id="admin-last-name"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email *</Label>
                <Input
                  id="admin-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => {
                    setExistingUserNotice(null);
                    setForm((f) => ({ ...f, email: e.target.value }));
                  }}
                  autoComplete="email"
                />
              </div>
              {!existingUserNotice && (
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Temporary password *</Label>
                  <div className="relative">
                    <Input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, password: e.target.value }))
                      }
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum 8 characters. Email is confirmed automatically.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {!existingUserNotice && (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating…" : "Create admin"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
