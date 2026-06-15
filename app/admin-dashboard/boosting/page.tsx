'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, isBefore, isAfter, parseISO } from "date-fns";
import {
  DEFAULT_MANUAL_BOOST_DURATION_ID,
  MANUAL_BOOST_DURATION_PRESETS,
  getBoostEndTimeForPreset,
  matchDurationPresetId,
  parseDatetimeLocalInputValue,
  toDatetimeLocalInputValue,
  type ManualBoostDurationPresetId,
} from "@/lib/config/admin-boost-durations";
import { 
  BarChart, 
  CalendarIcon, 
  AlertTriangle, 
  Clock, 
  Edit3, 
  Save, 
  X,
  TrendingUp,
  Eye,
  Trash2,
  Plus
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import TruncatedCellText from "@/components/admin-dashboard/TruncatedCellText";

// Types for boost data (matching database.types.ts)
interface BoostData {
  id: string;
  listing_id: string;
  listing_type: 'sale' | 'stud' | 'showcase' | 'sale_listings' | 'stud_listings' | 'showcase_listings';
  boost_type: 'standard' | 'premium' | 'elite' | 'gold' | 'none';
  user_id: string;
  boost_start_time: string | null;
  boost_end_time: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Database fields from boosts table
  amount?: number;
  currency?: string;
  payment_status?: string;
  stripe_payment_intent_id?: string | null;
  stripe_session_id?: string | null;
  // Joined/enriched data
  listing_title?: string;
  user_email?: string;
  user_name?: string;
  is_pending_approval?: boolean;
}

interface EditingBoost {
  id: string;
  boost_type: string;
  boost_end_time: Date;
  duration_preset_id: ManualBoostDurationPresetId;
}

export default function AdminBoostingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State management
  const [boosts, setBoosts] = useState<BoostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBoost, setEditingBoost] = useState<EditingBoost | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boostToDelete, setBoostToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBoostForm, setNewBoostForm] = useState({
    listingId: '',
    boostType: 'standard' as 'standard' | 'premium' | 'elite' | 'gold',
    durationPresetId: DEFAULT_MANUAL_BOOST_DURATION_ID as ManualBoostDurationPresetId,
    customEndTime: getBoostEndTimeForPreset(DEFAULT_MANUAL_BOOST_DURATION_ID),
  });
  const [detectedListingType, setDetectedListingType] = useState<'sale_listings' | 'stud_listings' | null>(null);

  // Boost type options
  const boostTypes = [
    { value: 'none', label: 'None', color: 'bg-gray-100 text-gray-800' },
    { value: 'standard', label: 'Standard', color: 'bg-orange-100 text-orange-800' },
    { value: 'premium', label: 'Premium', color: 'bg-blue-100 text-blue-800' },
    { value: 'elite', label: 'Elite', color: 'bg-purple-100 text-purple-800' },
    { value: 'gold', label: 'Gold', color: 'bg-yellow-100 text-yellow-800' }
  ];

  // Fetch all active boosts with related data
  const fetchBoosts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch boosts data
      const { data: boostsData, error: boostsError } = await supabase
        .from('boosts')
        .select('*')
        .order('created_at', { ascending: false });

      if (boostsError) throw boostsError;

      // Fetch pending boosted listings (listings with current_boost_id but admin_approved=false)
      const [pendingSale, pendingStud, pendingShowcase] = await Promise.all([
        supabase
          .from('sale_listings')
          .select('id, title, current_boost_id, admin_approved, is_published, seller_id')
          .not('current_boost_id', 'is', null)
          .eq('admin_approved', false),
        supabase
          .from('stud_listings')
          .select('id, title, current_boost_id, admin_approved, is_published, user_id')
          .not('current_boost_id', 'is', null)
          .eq('admin_approved', false),
        supabase
          .from('showcase_listings')
          .select('id, title, admin_approved, is_published, seller_id')
          .eq('admin_approved', false)
      ]);

      // Convert pending listings to boost-like format
      const pendingBoostedListings: BoostData[] = [];
      
      // Process pending sale listings
      if (pendingSale.data) {
        for (const listing of pendingSale.data) {
          if (!listing.current_boost_id) continue;
          
          // Fetch the boost details
          const { data: boostData } = await supabase
            .from('boosts')
            .select('*')
            .eq('id', listing.current_boost_id)
            .single();
          
          if (boostData) {
            // Fetch user data
            let userEmail = 'Unknown';
            let userName = 'Unknown User';
            const { data: userData, error: profileErr } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, email')
              .eq('id', listing.seller_id)
              .maybeSingle();

            if (!profileErr && userData) {
              userEmail = userData.email || 'Unknown';
              userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown User';
            }
            
            pendingBoostedListings.push({
              ...boostData,
              listing_title: listing.title,
              user_email: userEmail,
              user_name: userName,
              is_pending_approval: true
            } as BoostData & { is_pending_approval?: boolean });
          }
        }
      }
      
      // Process pending stud listings
      if (pendingStud.data) {
        for (const listing of pendingStud.data) {
          if (!listing.current_boost_id) continue;
          
          const { data: boostData } = await supabase
            .from('boosts')
            .select('*')
            .eq('id', listing.current_boost_id)
            .single();
          
          if (boostData) {
            let userEmail = 'Unknown';
            let userName = 'Unknown User';
            const { data: userData, error: profileErr } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, email')
              .eq('id', listing.user_id)
              .maybeSingle();

            if (!profileErr && userData) {
              userEmail = userData.email || 'Unknown';
              userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown User';
            }
            
            pendingBoostedListings.push({
              ...boostData,
              listing_title: listing.title,
              user_email: userEmail,
              user_name: userName,
              is_pending_approval: true
            } as BoostData & { is_pending_approval?: boolean });
          }
        }
      }
      
      // Process pending showcase listings (no current_boost_id column, so just list them)
      if (pendingShowcase.data) {
        for (const listing of pendingShowcase.data) {
          let userEmail = 'Unknown';
          let userName = 'Unknown User';
          const { data: userData, error: profileErr } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, email')
            .eq('id', listing.seller_id)
            .maybeSingle();

          if (!profileErr && userData) {
            userEmail = userData.email || 'Unknown';
            userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown User';
          }

          pendingBoostedListings.push({
            id: `pending-showcase-${listing.id}`,
            listing_id: listing.id,
            listing_type: 'showcase_listings',
            boost_type: 'standard',
            user_id: listing.seller_id,
            boost_start_time: null,
            boost_end_time: null,
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            listing_title: listing.title,
            user_email: userEmail,
            user_name: userName,
            is_pending_approval: true,
          } as BoostData & { is_pending_approval?: boolean });
        }
      }

      // Enrich boosts with user and listing data
      const enrichedBoosts = await Promise.all(
        (boostsData || []).map(async (boost) => {
          let listingTitle = 'Unknown Listing';
          let userEmail = 'Unknown';
          let userName = 'Unknown User';

          // Fetch user data
          const { data: userData, error: profileErr } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, email')
            .eq('id', boost.user_id)
            .maybeSingle();

          if (!profileErr && userData) {
            userEmail = userData.email || 'Unknown';
            userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown User';
          }

          // Fetch listing data based on listing type
          try {
            if (boost.listing_type === 'sale' || boost.listing_type === 'sale_listings') {
              const { data: listingData } = await supabase
                .from('sale_listings')
                .select('title')
                .eq('id', boost.listing_id)
                .single();
              
              if (listingData) {
                listingTitle = listingData.title;
              }
            } else if (boost.listing_type === 'stud' || boost.listing_type === 'stud_listings') {
              const { data: listingData } = await supabase
                .from('stud_listings')
                .select('title')
                .eq('id', boost.listing_id)
                .single();
              
              if (listingData) {
                listingTitle = listingData.title;
              }
            } else if (boost.listing_type === 'showcase' || boost.listing_type === 'showcase_listings') {
              const { data: listingData } = await supabase
                .from('showcase_listings')
                .select('title')
                .eq('id', boost.listing_id)
                .single();
              
              if (listingData) {
                listingTitle = listingData.title;
              }
            }
          } catch (error) {
          }

          return {
            ...boost,
            listing_title: listingTitle,
            user_email: userEmail,
            user_name: userName
          } as BoostData;
        })
      );

      // Combine active boosts with pending boosted listings
      // Use a Map to prevent duplicates by boost ID
      const boostsMap = new Map<string, BoostData>();
      
      // Add enriched boosts first
      enrichedBoosts.forEach(boost => {
        boostsMap.set(boost.id, boost);
      });
      
      // Add pending boosted listings (will overwrite if duplicate ID exists)
      pendingBoostedListings.forEach(boost => {
        boostsMap.set(boost.id, boost);
      });
      
      // Convert map to array and sort by created_at descending
      const uniqueBoosts = Array.from(boostsMap.values()).sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      
      setBoosts(uniqueBoosts);
    } catch (error: any) {
      console.error('Error fetching boosts:', error);
      const errorMessage = error?.message || error?.code || 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage || "Failed to load boost data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load data on component mount
  useEffect(() => {
    fetchBoosts();
  }, [fetchBoosts]);

  // Realtime subscriptions for boosts and related listings
  useEffect(() => {
    // Channel for boosts table changes
    const boostsChannel = supabase
      .channel('admin-boosts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boosts',
        },
        (payload) => {
          // Refetch all boosts when any boost changes
          fetchBoosts().catch((error) => {
            console.error('❌ Error refetching boosts after realtime change:', error);
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to boosts realtime changes');
        }
      });

    // Channel for sale_listings changes (affects pending boosts)
    const saleListingsChannel = supabase
      .channel('admin-boosts-sale-listings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sale_listings',
        },
        (payload) => {
          // Only refetch if it affects boosts (has current_boost_id or admin_approved changed)
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (
            (newData?.current_boost_id || oldData?.current_boost_id) ||
            (newData?.admin_approved !== oldData?.admin_approved)
          ) {
            fetchBoosts().catch((error) => {
              console.error('❌ Error refetching boosts after sale_listing change:', error);
            });
          }
        }
      )
      .subscribe();

    // Channel for stud_listings changes (affects pending boosts)
    const studListingsChannel = supabase
      .channel('admin-boosts-stud-listings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stud_listings',
        },
        (payload) => {
          // Only refetch if it affects boosts (has current_boost_id or admin_approved changed)
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (
            (newData?.current_boost_id || oldData?.current_boost_id) ||
            (newData?.admin_approved !== oldData?.admin_approved)
          ) {
            fetchBoosts().catch((error) => {
              console.error('❌ Error refetching boosts after stud_listing change:', error);
            });
          }
        }
      )
      .subscribe();

    // Channel for showcase_listings changes (affects pending boosts)
    const showcaseListingsChannel = supabase
      .channel('admin-boosts-showcase-listings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'showcase_listings',
        },
        (payload) => {
          // Only refetch if admin_approved changed
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData?.admin_approved !== oldData?.admin_approved) {
            fetchBoosts().catch((error) => {
              console.error('❌ Error refetching boosts after showcase_listing change:', error);
            });
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(boostsChannel);
      supabase.removeChannel(saleListingsChannel);
      supabase.removeChannel(studListingsChannel);
      supabase.removeChannel(showcaseListingsChannel);
    };
  }, [fetchBoosts]);

  // Get status information for a boost
  const getBoostStatus = (boost: BoostData) => {
    // Check if this is a pending approval
    if (boost.is_pending_approval) {
      return {
        status: 'pending',
        label: 'Pending Approval',
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="w-3 h-3" />
      };
    }

    if (!boost.boost_end_time) {
      return {
        status: 'active',
        label: 'Active',
        color: 'bg-green-100 text-green-800',
        icon: <TrendingUp className="w-3 h-3" />
      };
    }

    const now = new Date();
    const endTime = new Date(boost.boost_end_time);
    const timeDiff = endTime.getTime() - now.getTime();
    const hoursUntilExpiry = timeDiff / (1000 * 60 * 60);

    if (!boost.is_active || isBefore(endTime, now)) {
      return {
        status: 'expired',
        label: 'Expired',
        color: 'bg-red-100 text-red-800',
        icon: <X className="w-3 h-3" />
      };
    } else if (hoursUntilExpiry <= 48) {
      return {
        status: 'expiring',
        label: 'Expires Soon',
        color: 'bg-orange-100 text-orange-800',
        icon: <AlertTriangle className="w-3 h-3" />
      };
    } else {
      return {
        status: 'active',
        label: 'Active',
        color: 'bg-green-100 text-green-800',
        icon: <TrendingUp className="w-3 h-3" />
      };
    }
  };

  // Start editing a boost
  const startEdit = (boost: BoostData) => {
    if (!boost.boost_end_time || !boost.boost_start_time) {
      // If no end time, set default duration
      const startTime = new Date();
      const endTime = getBoostEndTimeForPreset(DEFAULT_MANUAL_BOOST_DURATION_ID, startTime);
      setEditingBoost({
        id: boost.id,
        boost_type: boost.boost_type,
        boost_end_time: endTime,
        duration_preset_id: DEFAULT_MANUAL_BOOST_DURATION_ID,
      });
      return;
    }

    const endTime = new Date(boost.boost_end_time);
    const startTime = new Date(boost.boost_start_time);

    setEditingBoost({
      id: boost.id,
      boost_type: boost.boost_type,
      boost_end_time: endTime,
      duration_preset_id: matchDurationPresetId(startTime, endTime),
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingBoost(null);
  };

  // Save boost changes
  const saveBoost = async () => {
    if (!editingBoost) return;

    try {
      setSaving(true);

      // If boost type is 'none', deactivate the boost
      if (editingBoost.boost_type === 'none') {
        // Deactivate boost
        const { error: updateError } = await supabase
          .from('boosts')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBoost.id);

        if (updateError) throw updateError;

        // Clear boost from listings
        const boostToUpdate = boosts.find(b => b.id === editingBoost.id);
        if (boostToUpdate) {
          // Map listing type to table name
          let tableName: 'sale_listings' | 'stud_listings' | 'showcase_listings';
          const listingType = boostToUpdate.listing_type;
          
          if (listingType === 'sale' || listingType === 'sale_listings') {
            tableName = 'sale_listings';
          } else if (listingType === 'stud' || listingType === 'stud_listings') {
            tableName = 'stud_listings';
          } else if (listingType === 'showcase' || listingType === 'showcase_listings') {
            tableName = 'showcase_listings';
          } else {
            throw new Error(`Unknown listing type: ${listingType}`);
          }
          
          const { error: listingError } = await supabase
            .from(tableName)
            .update({ current_boost_id: null })
            .eq('id', boostToUpdate.listing_id);

          if (listingError) throw listingError;
        }
      } else {
        // Get the boost to update start time
        const boostToUpdate = boosts.find(b => b.id === editingBoost.id);
        const startTime = boostToUpdate?.boost_start_time 
          ? new Date(boostToUpdate.boost_start_time)
          : new Date();

        // Update boost
        const { error: updateError } = await supabase
          .from('boosts')
          .update({
            boost_type: editingBoost.boost_type,
            boost_start_time: startTime.toISOString(),
            boost_end_time: editingBoost.boost_end_time.toISOString(),
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBoost.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Success",
        description: "Boost updated successfully",
      });

      setEditingBoost(null);
      await fetchBoosts(); // Refresh data
    } catch (error) {
      console.error('Error updating boost:', error);
      toast({
        title: "Error",
        description: "Failed to update boost",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle boost type change
  const handleBoostTypeChange = (value: string) => {
    if (!editingBoost) return;
    
    setEditingBoost({
      ...editingBoost,
      boost_type: value
    });
  };

  const getBoostStartForEdit = (boostId: string): Date => {
    const row = boosts.find((b) => b.id === boostId);
    return row?.boost_start_time ? new Date(row.boost_start_time) : new Date();
  };

  // Handle duration preset change (hours/days from boost start)
  const handleDurationPresetChange = (presetId: ManualBoostDurationPresetId) => {
    if (!editingBoost) return;

    if (presetId === 'custom') {
      setEditingBoost({
        ...editingBoost,
        duration_preset_id: 'custom',
      });
      return;
    }

    const startTime = getBoostStartForEdit(editingBoost.id);
    setEditingBoost({
      ...editingBoost,
      duration_preset_id: presetId,
      boost_end_time: getBoostEndTimeForPreset(presetId, startTime),
    });
  };

  const handleEditCustomEndDatetime = (value: string) => {
    if (!editingBoost) return;
    const parsed = parseDatetimeLocalInputValue(value);
    if (!parsed) return;
    setEditingBoost({
      ...editingBoost,
      duration_preset_id: 'custom',
      boost_end_time: parsed,
    });
  };

  // Handle custom date selection (calendar — end of selected day)
  const handleDateSelect = (date: Date | undefined) => {
    if (!editingBoost || !date) return;

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 0, 0);

    setEditingBoost({
      ...editingBoost,
      boost_end_time: endOfDay,
      duration_preset_id: 'custom',
    });
  };

  // Auto-detect listing type when ID is entered
  const detectListingType = async (listingId: string) => {
    if (!listingId.trim()) {
      setDetectedListingType(null);
      return;
    }

    // Check sale_listings first
    const { data: saleData } = await supabase
      .from('sale_listings')
      .select('id')
      .eq('id', listingId)
      .maybeSingle();

    if (saleData) {
      setDetectedListingType('sale_listings');
      return;
    }

    // Check stud_listings
    const { data: studData } = await supabase
      .from('stud_listings')
      .select('id')
      .eq('id', listingId)
      .maybeSingle();

    if (studData) {
      setDetectedListingType('stud_listings');
      return;
    }

    // Check if it's a showcase listing (not allowed)
    const { data: showcaseData } = await supabase
      .from('showcase_listings')
      .select('id')
      .eq('id', listingId)
      .maybeSingle();

    if (showcaseData) {
      toast({
        title: "Invalid Listing",
        description: "Showcase listings cannot be boosted",
        variant: "destructive",
      });
      setDetectedListingType(null);
      return;
    }

    // Not found in any table
    setDetectedListingType(null);
  };

  // Create new boost
  const handleCreateBoost = async () => {
    if (!newBoostForm.listingId || !detectedListingType) {
      toast({
        title: "Error",
        description: "Please enter a valid listing ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Get the user_id based on detected listing type
      let userId: string | null = null;

      if (detectedListingType === 'sale_listings') {
        const { data, error } = await supabase
          .from('sale_listings')
          .select('seller_id, id')
          .eq('id', newBoostForm.listingId)
          .single();
        if (error || !data) {
          toast({
            title: "Error",
            description: `Listing not found in sale listings`,
            variant: "destructive",
          });
          return;
        }
        userId = data.seller_id;
      } else if (detectedListingType === 'stud_listings') {
        const { data, error } = await supabase
          .from('stud_listings')
          .select('user_id, id')
          .eq('id', newBoostForm.listingId)
          .single();
        if (error || !data) {
          toast({
            title: "Error",
            description: `Listing not found in stud listings`,
            variant: "destructive",
          });
          return;
        }
        userId = data.user_id;
      }

      if (!userId) {
        toast({
          title: "Error",
          description: "Could not find user for this listing",
          variant: "destructive",
        });
        return;
      }

      const boostStartTime = new Date();
      const boostEndTime =
        newBoostForm.durationPresetId === 'custom'
          ? newBoostForm.customEndTime
          : getBoostEndTimeForPreset(newBoostForm.durationPresetId, boostStartTime);

      if (boostEndTime.getTime() <= boostStartTime.getTime()) {
        toast({
          title: "Invalid duration",
          description: "End time must be after the start time.",
          variant: "destructive",
        });
        return;
      }

      const dbListingType = detectedListingType.replace('_listings', '');
      
      const { data: boostData, error: boostError } = await supabase
        .from('boosts')
        .insert({
          listing_id: newBoostForm.listingId,
          listing_type: dbListingType,
          user_id: userId,
          boost_type: newBoostForm.boostType,
          amount: 0,
          currency: 'EUR',
          payment_status: 'paid',
          is_active: true,
          boost_start_time: boostStartTime.toISOString(),
          boost_end_time: boostEndTime.toISOString()
        })
        .select()
        .single();

      if (boostError) throw boostError;

      // Update listing with boost reference AND auto-approve/publish
      const { error: updateError } = await supabase
        .from(detectedListingType)
        .update({ 
          current_boost_id: boostData.id,
          admin_approved: true,
          is_published: true
        })
        .eq('id', newBoostForm.listingId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Boost created successfully",
      });

      setCreateDialogOpen(false);
      setNewBoostForm({
        listingId: '',
        boostType: 'standard',
        durationPresetId: DEFAULT_MANUAL_BOOST_DURATION_ID,
        customEndTime: getBoostEndTimeForPreset(DEFAULT_MANUAL_BOOST_DURATION_ID),
      });
      setDetectedListingType(null);
      await fetchBoosts();
    } catch (error) {
      console.error('Error creating boost:', error);
      toast({
        title: "Error",
        description: "Failed to create boost",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle approval of pending boosted listing
  const handleApprovePendingBoost = async (boost: BoostData) => {
    try {
      setSaving(true);

      // Determine the table name based on listing type
      let tableName: 'sale_listings' | 'stud_listings' | 'showcase_listings';
      const listingType = boost.listing_type;
      
      if (listingType === 'sale' || listingType === 'sale_listings') {
        tableName = 'sale_listings';
      } else if (listingType === 'stud' || listingType === 'stud_listings') {
        tableName = 'stud_listings';
      } else if (listingType === 'showcase' || listingType === 'showcase_listings') {
        tableName = 'showcase_listings';
      } else {
        toast({
          title: "Error",
          description: "Unknown listing type",
          variant: "destructive",
        });
        return;
      }

      // UPDATE existing listing (preserving current_boost_id)
      const updateData: any = {
        admin_approved: true,
        is_published: true,
        // Preserve current_boost_id if it exists
        current_boost_id: boost.id
      };

      // For sale listings, also set status
      if (tableName === 'sale_listings') {
        updateData.status = 'active';
      }

      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', boost.listing_id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Boosted listing approved successfully",
      });

      await fetchBoosts(); // Refresh data
    } catch (error) {
      console.error('Error approving pending boost:', error);
      toast({
        title: "Error",
        description: "Failed to approve boosted listing",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle boost deletion
  const handleDelete = async () => {
    if (!boostToDelete) return;

    try {
      setSaving(true);
      
      // First clear the boost from the listing
      const boostToRemove = boosts.find(b => b.id === boostToDelete);
      if (boostToRemove) {
        // Map listing type to correct table name (handle both formats)
        let tableName: 'sale_listings' | 'stud_listings' | 'showcase_listings';
        const listingType = boostToRemove.listing_type;
        
        if (listingType === 'sale' || listingType === 'sale_listings') {
          tableName = 'sale_listings';
        } else if (listingType === 'stud' || listingType === 'stud_listings') {
          tableName = 'stud_listings';
        } else if (listingType === 'showcase' || listingType === 'showcase_listings') {
          tableName = 'showcase_listings';
        } else {
          tableName = 'sale_listings'; // Default fallback
        }
        
        // Clear current_boost_id from listing
        const { error: clearError } = await supabase
          .from(tableName)
          .update({ current_boost_id: null })
          .eq('id', boostToRemove.listing_id);

        if (clearError) {
          // Continue anyway to try deleting the boost
        }
      }

      // Then delete the boost record
      const { error } = await supabase
        .from('boosts')
        .delete()
        .eq('id', boostToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Boost deleted successfully",
      });

      await fetchBoosts(); // Refresh data
    } catch (error) {
      console.error('Error deleting boost:', error);
      toast({
        title: "Error",
        description: "Failed to delete boost",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
      setBoostToDelete(null);
    }
  };

  // Get boost type info
  const getBoostTypeInfo = (type: string) => {
    return boostTypes.find(bt => bt.value === type) || boostTypes[0];
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6 flex items-center">
          <BarChart className="h-6 w-6 mr-2" />
          Boost Management
        </h1>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate boost statistics
  const totalBoosts = boosts.length;
  const activeBoosts = boosts.filter(b => b.is_active && (!b.boost_end_time || isAfter(new Date(b.boost_end_time), new Date()))).length;
  const expiredBoosts = boosts.filter(b => !b.is_active || (b.boost_end_time && isBefore(new Date(b.boost_end_time), new Date()))).length;
  const expiringSoon = boosts.filter(b => {
    if (!b.boost_end_time) return false;
    const hoursUntilExpiry = (new Date(b.boost_end_time).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return b.is_active && hoursUntilExpiry > 0 && hoursUntilExpiry <= 48;
  }).length;

  return (
    <div className="min-w-0 w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold flex items-center">
          <BarChart className="h-6 w-6 mr-2 flex-shrink-0" />
          Boost Management
        </h1>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            variant="default"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Boost
          </Button>
          <Button
            onClick={() => fetchBoosts()}
            variant="outline"
            size="sm"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Boosts</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBoosts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeBoosts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringSoon}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredBoosts}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Active Boost Listings</CardTitle>
          <CardDescription>
            Manage boost levels and durations for all listings. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="table-fixed min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Listing</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Current Boost</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No boost data found
                    </TableCell>
                  </TableRow>
                ) : (
                  boosts.map((boost) => {
                    const isEditing = editingBoost?.id === boost.id;
                    const statusInfo = getBoostStatus(boost);
                    const boostTypeInfo = getBoostTypeInfo(boost.boost_type);

                    return (
                      <TableRow key={boost.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              <TruncatedCellText text={boost.listing_title} maxChars={28} className="max-w-[220px]" />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <TruncatedCellText
                                text={`${String(boost.listing_type ?? 'unknown').replace(/_/g, ' ')} • ID: ${String(boost.listing_id ?? '').slice(0, 8)}${boost.listing_id ? '…' : ''}`}
                                maxChars={30}
                                className="max-w-[220px]"
                              />
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div>
                            <div className="font-medium"><TruncatedCellText text={boost.user_name} maxChars={20} className="max-w-[170px]" /></div>
                            <div className="text-sm text-muted-foreground"><TruncatedCellText text={boost.user_email} maxChars={24} className="max-w-[170px]" /></div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editingBoost.boost_type}
                              onValueChange={handleBoostTypeChange}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {boostTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={boostTypeInfo.color}>
                              {boostTypeInfo.label}
                            </Badge>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {boost.boost_start_time ? format(parseISO(boost.boost_start_time), 'MMM dd, yyyy') : 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {boost.boost_start_time ? format(parseISO(boost.boost_start_time), 'HH:mm') : ''}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {isEditing ? (
                            <div className="space-y-2">
                              <Select
                                value={editingBoost.duration_preset_id}
                                onValueChange={(value) =>
                                  handleDurationPresetChange(value as ManualBoostDurationPresetId)
                                }
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MANUAL_BOOST_DURATION_PRESETS.map((duration) => (
                                    <SelectItem key={duration.id} value={duration.id}>
                                      {duration.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {editingBoost.duration_preset_id === 'custom' && (
                                <Input
                                  type="datetime-local"
                                  className="w-full max-w-[220px]"
                                  value={toDatetimeLocalInputValue(editingBoost.boost_end_time)}
                                  min={toDatetimeLocalInputValue(new Date())}
                                  onChange={(e) => handleEditCustomEndDatetime(e.target.value)}
                                />
                              )}
                              
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-32">
                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                    Custom
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={editingBoost.boost_end_time}
                                    onSelect={handleDateSelect}
                                    disabled={(date) => isBefore(date, new Date())}
                                    initialFocus
                                    className={cn("p-3 pointer-events-auto")}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          ) : (
                            <div>
                              <div className="text-sm">
                                {boost.boost_end_time ? format(parseISO(boost.boost_end_time), 'MMM dd, yyyy') : 'Never'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {boost.boost_end_time ? format(parseISO(boost.boost_end_time), 'HH:mm') : ''}
                              </div>
                            </div>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Badge className={statusInfo.color}>
                            <span className="flex items-center">
                              {statusInfo.icon}
                              <span className="ml-1">{statusInfo.label}</span>
                            </span>
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                size="sm"
                                onClick={saveBoost}
                                disabled={saving}
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                disabled={saving}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : boost.is_pending_approval ? (
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprovePendingBoost(boost)}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setBoostToDelete(boost.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEdit(boost)}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setBoostToDelete(boost.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Boost Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Manual Boost</DialogTitle>
            <DialogDescription>
              Manually boost a listing by ID. Choose hourly, daily, or a custom end date/time (ideal for short Gold boosts).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="listingId">Listing ID</Label>
              <Input
                id="listingId"
                placeholder="Enter listing UUID"
                value={newBoostForm.listingId}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewBoostForm({...newBoostForm, listingId: value});
                  detectListingType(value);
                }}
              />
              {newBoostForm.listingId && detectedListingType && (
                <p className="text-sm text-muted-foreground">
                  ✓ Detected: {detectedListingType === 'sale_listings' ? 'Sale Listing' : 'Stud Listing'}
                </p>
              )}
              {newBoostForm.listingId && !detectedListingType && (
                <p className="text-sm text-destructive">
                  Listing not found or invalid type
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="boostType">Boost Type</Label>
              <Select
                value={newBoostForm.boostType}
                onValueChange={(value: any) => setNewBoostForm({...newBoostForm, boostType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {boostTypes.filter(t => t.value !== 'none').map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select
                value={newBoostForm.durationPresetId}
                onValueChange={(value) => {
                  const presetId = value as ManualBoostDurationPresetId;
                  setNewBoostForm({
                    ...newBoostForm,
                    durationPresetId: presetId,
                    customEndTime:
                      presetId === 'custom'
                        ? newBoostForm.customEndTime
                        : getBoostEndTimeForPreset(presetId),
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_BOOST_DURATION_PRESETS.map((duration) => (
                    <SelectItem key={duration.id} value={duration.id}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newBoostForm.durationPresetId === 'custom' ? (
                <div className="space-y-1">
                  <Label htmlFor="customEnd" className="text-xs text-muted-foreground">
                    End date & time
                  </Label>
                  <Input
                    id="customEnd"
                    type="datetime-local"
                    value={toDatetimeLocalInputValue(newBoostForm.customEndTime)}
                    min={toDatetimeLocalInputValue(new Date())}
                    onChange={(e) => {
                      const parsed = parseDatetimeLocalInputValue(e.target.value);
                      if (parsed) {
                        setNewBoostForm({ ...newBoostForm, customEndTime: parsed });
                      }
                    }}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ends:{' '}
                  {format(
                    getBoostEndTimeForPreset(newBoostForm.durationPresetId),
                    'MMM d, yyyy HH:mm'
                  )}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBoost} disabled={saving}>
              {saving ? "Creating..." : "Create Boost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Boost</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this boost? This action cannot be undone and will immediately remove the boost from the listing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}




























