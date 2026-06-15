'use client';

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProductTable from "@/components/admin-dashboard/ProductTable";
import OrdersTable from "@/components/admin-dashboard/OrdersTable";
import ShopMarketingEmail from "@/components/admin-dashboard/ShopMarketingEmail";
import AdminShopSettings from "@/components/admin-dashboard/AdminShopSettings";

export default function AdminShopPage() {
  return (
    <div className="py-6">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shop Management</h1>
          <p className="text-muted-foreground">
            Manage your shop products, orders, and settings.
          </p>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="marketing">Marketing Emails</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="products" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Products Management</CardTitle>
                <CardDescription>
                  Create, update, and manage your shop products.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductTable />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Orders Management</CardTitle>
                <CardDescription>
                  View and manage customer orders.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrdersTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketing">
            <ShopMarketingEmail />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-4">
            <AdminShopSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}




























