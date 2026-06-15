import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Mail, MailX, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/lib/supabase/types';
import { useRouter } from 'next/navigation';

type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
type BreedAlert = Database['public']['Tables']['breed_alerts_log']['Row'];

const BreedAlertsManager: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [alertHistory, setAlertHistory] = useState<BreedAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserPreferences();
      fetchAlertHistory();
    }
  }, [user]);

  const fetchUserPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setPreferences(data);
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load your breed alert preferences.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAlertHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('breed_alerts_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setAlertHistory(data || []);
    } catch (error) {
      console.error('Error fetching alert history:', error);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          ...updates,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Settings Updated",
        description: "Your breed alert preferences have been saved.",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update your preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const removeBreedFromAlerts = async (breedToRemove: string) => {
    if (!preferences) return;

    const updatedBreedIds = preferences.breed_ids.filter(breed => breed !== breedToRemove);
    await updatePreferences({ breed_ids: updatedBreedIds });
  };

  const toggleGlobalAlerts = async (enabled: boolean) => {
    await updatePreferences({ breed_alerts_enabled: enabled });
  };

  const toggleEmailNotifications = async (enabled: boolean) => {
    await updatePreferences({ email_notifications_enabled: enabled });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Breed Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences || !preferences.breed_ids || preferences.breed_ids.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Breed Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Breed Preferences Set</h3>
            <p className="text-gray-600 mb-4">
              Take our breed quiz to set up personalized alerts for your preferred dog breeds.
            </p>
            <Button onClick={() => router.push('/quiz')}>
              Take Breed Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Breed Alerts Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Alert Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {preferences.breed_alerts_enabled ? (
                  <Bell className="h-4 w-4 text-green-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-gray-400" />
                )}
                <span className="font-medium">Breed Alerts</span>
              </div>
              <p className="text-sm text-gray-600">
                Get notified when new listings match your preferred breeds
              </p>
            </div>
            <Switch
              checked={preferences.breed_alerts_enabled}
              onCheckedChange={toggleGlobalAlerts}
              disabled={isSaving}
            />
          </div>

          {/* Email Notifications Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {preferences.email_notifications_enabled ? (
                  <Mail className="h-4 w-4 text-blue-600" />
                ) : (
                  <MailX className="h-4 w-4 text-gray-400" />
                )}
                <span className="font-medium">Email Notifications</span>
              </div>
              <p className="text-sm text-gray-600">
                Receive email alerts for new breed listings
              </p>
            </div>
            <Switch
              checked={preferences.email_notifications_enabled}
              onCheckedChange={toggleEmailNotifications}
              disabled={isSaving || !preferences.breed_alerts_enabled}
            />
          </div>

          {/* Breed List */}
          <div>
            <h3 className="font-medium mb-3">Your Preferred Breeds</h3>
            <div className="space-y-2">
              {preferences.breed_ids.map((breed) => (
                <div
                  key={breed}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{breed}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBreedFromAlerts(breed)}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert History */}
      {alertHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertHistory.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{alert.breed} Listing Alert</p>
                    <p className="text-sm text-gray-600">
                      {alert.listing_type.charAt(0).toUpperCase() + alert.listing_type.slice(1)} listing
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BreedAlertsManager;
