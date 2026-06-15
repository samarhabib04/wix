import React, { useState, useMemo } from 'react';
import { useBoostedListings, useBoostManagement } from '@/hooks/useBoostedListings';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { CalendarIcon, Edit, Trash, Clock, Search, Filter, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminTable, { TableColumn, TableAction } from '@/components/admin-dashboard/AdminTable';
import EmptyState from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const BoostedListingsTable = () => {
  const { data: listings, isLoading, error } = useBoostedListings();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { changeBoostTier, extendBoostDuration, expireBoost, removeBoost } = useBoostManagement();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBoostLevel, setFilterBoostLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Edit states
  const [editingBoost, setEditingBoost] = useState<string | null>(null);
  const [newTier, setNewTier] = useState<string>('');
  const [extendingBoost, setExtendingBoost] = useState<string | null>(null);
  const [newEndDate, setNewEndDate] = useState<Date>();

  // Filter listings based on search and filters
  const filteredListings = useMemo(() => {
    if (!listings) return [];
    
    return listings.filter(listing => {
      const matchesSearch = searchTerm === '' || 
        listing.listing_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.seller_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBoostLevel = filterBoostLevel === 'all' || 
        listing.boost_type.toLowerCase() === filterBoostLevel.toLowerCase();
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && listing.is_active) ||
        (filterStatus === 'expired' && !listing.is_active);
      
      return matchesSearch && matchesBoostLevel && matchesStatus;
    });
  }, [listings, searchTerm, filterBoostLevel, filterStatus]);

  if (isLoading || isAdminLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold">Boosted Listings</h2>
        </div>
        <AdminTable
          data={[]}
          columns={[]}
          isLoading={true}
          emptyMessage="Loading boosted listings..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <EmptyState 
            title="Error Loading Data"
            description={`Failed to load boosted listings: ${error.message}`}
            icon="database"
          />
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP');
  };

  const getStatusBadge = (isActive: boolean, endTime: string) => {
    const now = new Date();
    const endDate = new Date(endTime);
    
    if (isActive && endDate > now) {
      return <Badge className="bg-green-500">Active</Badge>;
    } else {
      return <Badge variant="destructive">Expired</Badge>;
    }
  };

  const getBoostTierBadge = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'gold':
        return <Badge className="bg-yellow-500">Gold</Badge>;
      case 'silver':
        return <Badge className="bg-gray-400">Silver</Badge>;
      case 'bronze':
        return <Badge className="bg-amber-600">Bronze</Badge>;
      case 'premium':
        return <Badge className="bg-blue-500">Premium</Badge>;
      case 'elite':
        return <Badge className="bg-purple-500">Elite</Badge>;
      default:
        return <Badge variant="outline">{tier}</Badge>;
    }
  };

  // Define table columns
  const columns: TableColumn[] = [
    {
      key: 'listing',
      label: 'Listing',
      width: 'min-w-[300px]',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.listing_images && row.listing_images.length > 0 ? (
            <img 
              src={row.listing_images[0]} 
              alt={row.listing_title}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium">{row.listing_title}</p>
            <p className="text-sm text-muted-foreground capitalize">{row.listing_type} listing</p>
          </div>
        </div>
      )
    },
    {
      key: 'seller_name',
      label: 'Seller',
      render: (value) => <span className="font-medium">{value}</span>
    },
    {
      key: 'boost_type',
      label: 'Boost Tier',
      render: (value) => getBoostTierBadge(value)
    },
    {
      key: 'boost_start_time',
      label: 'Start Date',
      render: (value) => value ? formatDate(value) : 'N/A'
    },
    {
      key: 'boost_end_time',
      label: 'Expiration',
      render: (value) => value ? formatDate(value) : 'Never'
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => getStatusBadge(row.is_active, row.boost_end_time)
    }
  ];

  // Define table actions for admins
  const actions: TableAction[] = isAdmin ? [
    {
      label: 'Change Tier',
      onClick: (row) => {
        setEditingBoost(row.id);
        setNewTier(row.boost_type);
      }
    },
    {
      label: 'Extend Duration',
      onClick: (row) => {
        setExtendingBoost(row.id);
        setNewEndDate(row.boost_end_time ? new Date(row.boost_end_time) : new Date());
      }
    },
    {
      label: 'Expire Early',
      onClick: (row) => expireBoost.mutate(row.id),
      variant: 'secondary' as const
    },
    {
      label: 'Remove Boost',
      onClick: (row) => removeBoost.mutate(row.id),
      variant: 'destructive' as const,
      separator: true
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold">Boosted Listings</h2>
        <div className="text-sm text-brand-dark-green font-medium">
          Total boosted: {filteredListings.length} / {listings?.length || 0}
        </div>
      </div>

      {/* Visibility Banner */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Boost Visibility Impact</h3>
              <p className="text-blue-800 text-sm">
                Boosted listings appear higher in search results and category pages. Active boosts directly affect 
                front-end visibility and user engagement. Premium tiers receive priority placement over standard listings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by listing title or seller name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterBoostLevel} onValueChange={setFilterBoostLevel}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Boost Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <AdminTable
        data={filteredListings}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        emptyMessage="No boosted listings found matching your criteria."
      />

      {/* Change Tier Modal */}
      {editingBoost && (
        <AlertDialog open={!!editingBoost} onOpenChange={() => setEditingBoost(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change Boost Tier</AlertDialogTitle>
              <AlertDialogDescription>
                Select a new boost tier for this listing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="elite">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  changeBoostTier.mutate({ boostId: editingBoost, newTier });
                  setEditingBoost(null);
                }}
              >
                Update Tier
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Extend Duration Modal */}
      {extendingBoost && (
        <AlertDialog open={!!extendingBoost} onOpenChange={() => setExtendingBoost(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Extend Boost Duration</AlertDialogTitle>
              <AlertDialogDescription>
                Select a new end date for this boost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newEndDate ? format(newEndDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newEndDate}
                    onSelect={setNewEndDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (newEndDate) {
                    extendBoostDuration.mutate({ boostId: extendingBoost, newEndDate });
                    setExtendingBoost(null);
                  }
                }}
              >
                Extend Duration
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default BoostedListingsTable;
