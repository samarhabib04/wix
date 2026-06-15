'use client';

import { useState } from "react";
import { Settings, Save, CreditCard, Mail, Bell, Shield, DollarSign, ToggleLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { AccountSettings } from "@/components/shared/AccountSettings";

export default function AdminSettingsPage() {
  const [generalSettings, setGeneralSettings] = useState({
    siteName: "Dog Quest",
    contactEmail: "admin@dogquest.com",
    supportPhone: "123-456-7890",
    defaultCurrency: "EUR",
    dateFormat: "DD-MM-YYYY",
    timeFormat: "24h"
  });
  
  const [paymentSettings, setPaymentSettings] = useState({
    stripePublishableKey: "pk_test_**************************************",
    stripeSecretKey: "sk_test_**************************************",
    paymentRequired: true,
    minWithdrawal: "50",
    processingFee: "2.9",
    vatRate: "20"
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    newListingEmail: true,
    newListingSms: false,
    newUserEmail: true,
    newUserSms: false,
    reportEmail: true,
    reportSms: true,
    dailyDigestEmail: true,
    weeklyReportEmail: true,
    emailServiceApiKey: "resend_*****************************"
  });
  
  const [featureToggles, setFeatureToggles] = useState({
    requirePaymentForSaleListing: true,
    requirePaymentForStudListing: true,
    requirePaymentForShowcaseListing: false,
    requirePaymentForBusinessListing: true,
    enableBoostingSystem: true,
    enableGoldBoosts: true,
    enableWaitlist: true,
    enableBlogFeature: true,
    enableReviewSystem: true,
    enableVisiblity: true,
  });
  
  const handleSaveGeneral = () => {
    toast({
      title: "Settings Saved",
      description: "General settings have been updated successfully.",
    });
  };
  
  const handleSavePayment = () => {
    toast({
      title: "Settings Saved",
      description: "Payment settings have been updated successfully.",
    });
  };
  
  const handleSaveNotifications = () => {
    toast({
      title: "Settings Saved",
      description: "Notification settings have been updated successfully.",
    });
  };
  
  const handleSaveToggles = () => {
    toast({
      title: "Settings Saved",
      description: "Feature toggles have been updated successfully.",
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Platform Settings</h2>
        <p className="text-gray-500 mt-1">
          Configure global settings for the Dog Quest platform.
        </p>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <div className="w-full overflow-x-auto md:overflow-visible">
          <TabsList className="inline-flex w-max md:w-auto md:grid md:grid-cols-5 lg:w-[800px]">
            <TabsTrigger value="general" className="flex-shrink-0">General</TabsTrigger>
            <TabsTrigger value="payment" className="flex-shrink-0">Payment</TabsTrigger>
            <TabsTrigger value="notifications" className="flex-shrink-0">Notifications</TabsTrigger>
            <TabsTrigger value="toggles" className="flex-shrink-0">Feature Toggles</TabsTrigger>
            <TabsTrigger value="account" className="flex-shrink-0">My Account</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="general" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                General Settings
              </CardTitle>
              <CardDescription>
                Configure basic information about your platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">Site Name</Label>
                  <Input 
                    id="site-name" 
                    value={generalSettings.siteName}
                    onChange={(e) => setGeneralSettings({...generalSettings, siteName: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact Email</Label>
                  <Input 
                    id="contact-email" 
                    type="email"
                    value={generalSettings.contactEmail}
                    onChange={(e) => setGeneralSettings({...generalSettings, contactEmail: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="support-phone">Support Phone</Label>
                  <Input 
                    id="support-phone" 
                    type="tel"
                    value={generalSettings.supportPhone}
                    onChange={(e) => setGeneralSettings({...generalSettings, supportPhone: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="default-currency">Default Currency</Label>
                  <Select 
                    value={generalSettings.defaultCurrency}
                    onValueChange={(value) => setGeneralSettings({...generalSettings, defaultCurrency: value})}
                  >
                    <SelectTrigger id="default-currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="GBP">British Pound (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select 
                    value={generalSettings.dateFormat}
                    onValueChange={(value) => setGeneralSettings({...generalSettings, dateFormat: value})}
                  >
                    <SelectTrigger id="date-format">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                      <SelectItem value="MM-DD-YYYY">MM-DD-YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time-format">Time Format</Label>
                  <Select 
                    value={generalSettings.timeFormat}
                    onValueChange={(value) => setGeneralSettings({...generalSettings, timeFormat: value})}
                  >
                    <SelectTrigger id="time-format">
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveGeneral}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="payment" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Settings
              </CardTitle>
              <CardDescription>
                Configure payment gateways and transaction settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stripe-publishable">Stripe Publishable Key</Label>
                <Input 
                  id="stripe-publishable" 
                  value={paymentSettings.stripePublishableKey}
                  onChange={(e) => setPaymentSettings({...paymentSettings, stripePublishableKey: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stripe-secret">Stripe Secret Key</Label>
                <Input 
                  id="stripe-secret"
                  type="password"
                  value={paymentSettings.stripeSecretKey}
                  onChange={(e) => setPaymentSettings({...paymentSettings, stripeSecretKey: e.target.value})}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="payment-required"
                  checked={paymentSettings.paymentRequired}
                  onCheckedChange={(checked) => setPaymentSettings({...paymentSettings, paymentRequired: checked})}
                />
                <Label htmlFor="payment-required">Require payment for listings</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="min-withdrawal">Minimum Withdrawal (€)</Label>
                  <Input 
                    id="min-withdrawal" 
                    type="number"
                    value={paymentSettings.minWithdrawal}
                    onChange={(e) => setPaymentSettings({...paymentSettings, minWithdrawal: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="processing-fee">Processing Fee (%)</Label>
                  <Input 
                    id="processing-fee" 
                    type="number"
                    value={paymentSettings.processingFee}
                    onChange={(e) => setPaymentSettings({...paymentSettings, processingFee: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vat-rate">VAT Rate (%)</Label>
                  <Input 
                    id="vat-rate" 
                    type="number"
                    value={paymentSettings.vatRate}
                    onChange={(e) => setPaymentSettings({...paymentSettings, vatRate: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSavePayment}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure email and SMS notification settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-api-key">Email Service API Key</Label>
                <Input 
                  id="email-api-key"
                  value={notificationSettings.emailServiceApiKey}
                  onChange={(e) => setNotificationSettings({...notificationSettings, emailServiceApiKey: e.target.value})}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Email Notifications</h4>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-listing-email" className="flex-1">New Listing Created</Label>
                    <Switch 
                      id="new-listing-email"
                      checked={notificationSettings.newListingEmail}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newListingEmail: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-user-email" className="flex-1">New User Registration</Label>
                    <Switch 
                      id="new-user-email"
                      checked={notificationSettings.newUserEmail}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newUserEmail: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="report-email" className="flex-1">Listing Report/Flags</Label>
                    <Switch 
                      id="report-email"
                      checked={notificationSettings.reportEmail}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, reportEmail: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="daily-digest-email" className="flex-1">Daily Digest</Label>
                    <Switch 
                      id="daily-digest-email"
                      checked={notificationSettings.dailyDigestEmail}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, dailyDigestEmail: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="weekly-report-email" className="flex-1">Weekly Analytics Report</Label>
                    <Switch 
                      id="weekly-report-email"
                      checked={notificationSettings.weeklyReportEmail}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, weeklyReportEmail: checked})}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">SMS Notifications</h4>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-listing-sms" className="flex-1">New Listing Created</Label>
                    <Switch 
                      id="new-listing-sms"
                      checked={notificationSettings.newListingSms}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newListingSms: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-user-sms" className="flex-1">New User Registration</Label>
                    <Switch 
                      id="new-user-sms"
                      checked={notificationSettings.newUserSms}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newUserSms: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="report-sms" className="flex-1">Listing Report/Flags</Label>
                    <Switch 
                      id="report-sms"
                      checked={notificationSettings.reportSms}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, reportSms: checked})}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotifications}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="toggles" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ToggleLeft className="h-5 w-5 mr-2" />
                Feature Toggles
              </CardTitle>
              <CardDescription>
                Enable or disable platform features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Payment Requirements</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="payment-sale" className="flex-1">Require Payment for Sale Listings</Label>
                    <Switch 
                      id="payment-sale"
                      checked={featureToggles.requirePaymentForSaleListing}
                      onCheckedChange={(checked) => setFeatureToggles({...featureToggles, requirePaymentForSaleListing: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="payment-stud" className="flex-1">Require Payment for Stud Listings</Label>
                    <Switch 
                      id="payment-stud"
                      checked={featureToggles.requirePaymentForStudListing}
                      onCheckedChange={(checked) => setFeatureToggles({...featureToggles, requirePaymentForStudListing: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="payment-showcase" className="flex-1">Require Payment for Showcase Listings</Label>
                    <Switch 
                      id="payment-showcase"
                      checked={featureToggles.requirePaymentForShowcaseListing}
                      onCheckedChange={(checked) => setFeatureToggles({...featureToggles, requirePaymentForShowcaseListing: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="payment-business" className="flex-1">Require Payment for Business Listings</Label>
                    <Switch 
                      id="payment-business"
                      checked={featureToggles.requirePaymentForBusinessListing}
                      onCheckedChange={(checked) => setFeatureToggles({...featureToggles, requirePaymentForBusinessListing: checked})}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Platform Features</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="boosting-system" className="flex-1">Enable Boosting System</Label>
                    <Switch 
                      id="boosting-system"
                      checked={featureToggles.enableBoostingSystem}
                      onCheckedChange={(checked) => setFeatureToggles({...featureToggles, enableBoostingSystem: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="gold-boosts" className="flex-1">Enable Gold Boosts</Label>
                    <Switch 
                      id="gold-boosts"
                      checked={featureToggles.enableGoldBoosts}
                      onCheckedChange={(checked) => setFeatureToggles({...featureToggles, enableGoldBoosts: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="waitlist" className="flex-1">Enable Waitlist Feature</Label>
                    <Switch 
                      id="waitlist"
                      checked={featureToggles.enableWaitlist}
                      onCheckedChange={(checked) => setFeatureToggles({...featureToggles, enableWaitlist: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="blog-feature" className="flex-1">Enable Blog Feature</Label>
                    <Switch 
                      id="blog-feature"
                      checked={featureToggles.enableBlogFeature}
                      onCheckedChange={(checked) => setFeatureToggles({...featureToggles, enableBlogFeature: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="review-system" className="flex-1">Enable Review System</Label>
                    <Switch 
                      id="review-system"
                      checked={featureToggles.enableReviewSystem}
                      onCheckedChange={(checked) => setFeatureToggles({...featureToggles, enableReviewSystem: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="visibility" className="flex-1">Enable Content Visibility Controls</Label>
                    <Switch 
                      id="visibility"
                      checked={featureToggles.enableVisiblity}
                      onCheckedChange={(checked) => setFeatureToggles({...featureToggles, enableVisiblity: checked})}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
              <Button onClick={handleSaveToggles}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <AccountSettings 
            title="Personal Account Settings"
            description="Manage your admin account password and security settings"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}




























