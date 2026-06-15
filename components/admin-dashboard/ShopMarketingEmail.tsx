import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getEmailLogoUrl } from '@/lib/config/email-branding';

interface EmailCampaignResults {
  totalCustomers: number;
  successCount: number;
  errorCount: number;
  errors?: string[];
}

const ShopMarketingEmail: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<EmailCampaignResults | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    htmlContent: '',
    sendTo: 'recent' as 'all' | 'recent'
  });
  const { toast } = useToast();

  const handleSendEmails = async () => {
    if (!formData.subject.trim() || !formData.htmlContent.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide both subject and email content."
      });
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-shop-marketing-email', {
        body: {
          subject: formData.subject,
          htmlContent: formData.htmlContent,
          textContent: formData.htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML for text version
          fromName: 'Dog Quest',
          sendTo: formData.sendTo
        }
      });

      if (error) throw error;

      setResults(data);
      
      toast({
        title: "Email Campaign Sent",
        description: `Successfully sent to ${data.successCount} customers${data.errorCount > 0 ? ` with ${data.errorCount} failures` : ''}.`
      });

    } catch (error) {
      console.error('Error sending marketing emails:', error);
      toast({
        variant: "destructive",
        title: "Failed to Send Emails",
        description: (error instanceof Error ? error.message : String(error)) || "There was an error sending the marketing emails."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const emailTemplate = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
  <div style="background: linear-gradient(135deg, #2d5a27 0%, #4a7c59 100%); color: white; text-align: center; padding: 40px 20px;">
    <img src="${getEmailLogoUrl()}" alt="Dog Quest Logo" style="max-width: 120px; height: auto; margin-bottom: 15px;" onerror="this.style.display='none'">
    <h1 style="margin: 0; font-size: 28px;">Special Offer from Dog Quest!</h1>
  </div>
  
  <div style="padding: 40px 30px;">
    <h2 style="color: #2d5a27; margin-bottom: 20px;">Hello valued customer!</h2>
    
    <p style="font-size: 16px; line-height: 1.6;">Thank you for your recent purchase from our Dog Quest shop. We hope you and your furry friend are enjoying your new items!</p>
    
    <p style="font-size: 16px; line-height: 1.6;">As a special thank you, we're offering you an exclusive discount on your next order.</p>
    
    <div style="background-color: #f9fdf9; border: 1px solid #BFCFBB; border-radius: 8px; margin: 20px 0; padding: 20px; text-align: center;">
      <h3 style="color: #2d5a27; margin: 0 0 10px 0;">🎉 Exclusive Offer</h3>
      <p style="font-size: 18px; font-weight: bold; color: #344C3D; margin: 0;">10% OFF your next purchase</p>
      <p style="font-size: 14px; color: #666; margin: 10px 0 0 0;">Use code: LOYAL10</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://dogquest.ie/shop" style="display: inline-block; background: linear-gradient(135deg, #2d5a27 0%, #4a7c59 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
        Shop Now
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">This offer is valid for the next 30 days. Thank you for being part of the Dog Quest family!</p>
  </div>
  
  <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
    <p style="margin: 0;">
      <a href="https://dogquest.ie" style="color: #738A6E; text-decoration: underline;">Dog Quest</a>
    </p>
    <p style="margin: 10px 0 0 0; font-size: 12px;">Your trusted companion in finding the perfect dog</p>
  </div>
</div>`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Marketing Emails
        </CardTitle>
        <CardDescription>
          Send promotional emails to customers who have purchased from the shop.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Enter email subject..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>Recipient Filter</Label>
            <RadioGroup
              value={formData.sendTo}
              onValueChange={(value: 'all' | 'recent') => setFormData(prev => ({ ...prev, sendTo: value }))}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recent" id="recent" />
                <Label htmlFor="recent">Recent customers (last 3 months)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">All customers</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="content">Email Content (HTML)</Label>
            <Textarea
              id="content"
              value={formData.htmlContent}
              onChange={(e) => setFormData(prev => ({ ...prev, htmlContent: e.target.value }))}
              placeholder="Enter HTML email content..."
              rows={12}
              className="mt-1 font-mono text-sm"
            />
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, htmlContent: emailTemplate }))}
              >
                Use Template
              </Button>
            </div>
          </div>
        </div>

        {results && (
          <Card className={results.errorCount > 0 ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                {results.errorCount > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                <h3 className="font-semibold">Campaign Results</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{results.totalCustomers}</div>
                  <div className="text-sm text-gray-600">Total Recipients</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{results.successCount}</div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{results.errorCount}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-red-800 mb-2">Recent Errors:</h4>
                  <div className="text-sm text-red-700 space-y-1">
                    {results.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="truncate">{error}</div>
                    ))}
                    {results.errors.length > 5 && (
                      <div className="text-gray-600">... and {results.errors.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Button 
          onClick={handleSendEmails} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Sending Emails...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Marketing Email
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ShopMarketingEmail;
