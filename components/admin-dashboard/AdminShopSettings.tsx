"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save, Store, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MarketplaceBoostConfigRow {
  id?: string;
  boost_name: string;
  boost_amount: number;
  currency: string;
}

const DEFAULT_ROW: MarketplaceBoostConfigRow = {
  boost_name: "Marketplace Boost",
  boost_amount: 1000,
  currency: "EUR",
};

/**
 * Shop-level admin settings backed by `marketplace_boost_config`.
 * (Product/order flows use other tables; boost pricing is the main DB-driven shop knob today.)
 */
export default function AdminShopSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<MarketplaceBoostConfigRow>(DEFAULT_ROW);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("marketplace_boost_config" as any)
        .select("*")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      if (data && typeof data === "object" && "boost_amount" in data) {
        setRow({
          id: (data as MarketplaceBoostConfigRow).id,
          boost_name: (data as MarketplaceBoostConfigRow).boost_name ?? DEFAULT_ROW.boost_name,
          boost_amount: (data as MarketplaceBoostConfigRow).boost_amount ?? DEFAULT_ROW.boost_amount,
          currency: (data as MarketplaceBoostConfigRow).currency ?? DEFAULT_ROW.currency,
        });
      }
    } catch (e: unknown) {
      console.error(e);
      toast.error("Could not load shop boost settings.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (row.boost_amount <= 0) {
      toast.error("Boost amount must be greater than 0.");
      return;
    }
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("marketplace_boost_config" as any)
        .select("id")
        .maybeSingle();

      const payload = {
        boost_name: row.boost_name.trim() || DEFAULT_ROW.boost_name,
        boost_amount: Math.round(row.boost_amount),
        currency: row.currency || "EUR",
        updated_at: new Date().toISOString(),
      };

      let err;
      if (existing && typeof existing === "object" && "id" in existing) {
        const r = await supabase
          .from("marketplace_boost_config" as any)
          .update(payload)
          .eq("id", (existing as { id: string }).id);
        err = r.error;
      } else {
        const r = await supabase.from("marketplace_boost_config" as any).insert([payload]);
        err = r.error;
      }

      if (err) throw err;
      toast.success("Shop boost settings saved.");
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const amountEuros = row.boost_amount / 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Store className="h-4 w-4" />
        <AlertTitle>What you can configure here</AlertTitle>
        <AlertDescription className="text-sm leading-relaxed">
          Marketplace <strong>product boost</strong> pricing and label (used when sellers boost shop
          products). Listing carousel boost <em>names</em> for the whole site live under{" "}
          <Link
            href="/admin-dashboard/content/edit/boost-carousel"
            className="font-medium text-primary underline underline-offset-2"
          >
            Content → Boost carousel
          </Link>
          .
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Marketplace product boost
          </CardTitle>
          <CardDescription>
            Amount is stored in cents (e.g. 1000 = €10.00). This applies to shop product boosts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="boost_name">Display name</Label>
            <Input
              id="boost_name"
              value={row.boost_name}
              onChange={(e) => setRow((r) => ({ ...r, boost_name: e.target.value }))}
              placeholder="Marketplace Boost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="boost_euros">Price (in euros)</Label>
            <Input
              id="boost_euros"
              type="number"
              min={0.01}
              step={0.01}
              value={Number.isFinite(amountEuros) ? amountEuros : 0}
              onChange={(e) => {
                const euros = parseFloat(e.target.value);
                if (Number.isNaN(euros)) return;
                setRow((r) => ({ ...r, boost_amount: Math.round(euros * 100) }));
              }}
            />
            <p className="text-xs text-muted-foreground">
              Stored as {row.boost_amount} cents in the database.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={row.currency}
              onValueChange={(currency) => setRow((r) => ({ ...r, currency }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save boost settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick links</CardTitle>
          <CardDescription>Other shop-related areas in the admin.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/shop" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View public shop
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin-dashboard/content/edit/boost-carousel">
              Boost carousel &amp; listing boosts
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
