'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Calendar, CheckCircle, Circle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/ui/loading-spinner';
import AdminTablePagination from '@/components/admin-dashboard/AdminTablePagination';

interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  read: boolean;
  created_at: string;
  source: 'vet_partner' | 'business';
}

export default function BusinessEnquiriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [businessIds, setBusinessIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all');

  // Fetch all business listings for current user
  useEffect(() => {
    const fetchBusinessListings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('business_listings')
          .select('id')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching business listings:', error);
          toast({
            title: "Error",
            description: "Failed to load business information.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const ids = data.map(listing => listing.id);
          setBusinessIds(ids);
        } else {
          setBusinessIds([]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Exception fetching business listings:', error);
        setIsLoading(false);
      }
    };

    fetchBusinessListings();
  }, [user, toast]);

  // Fetch enquiries for all business listings
  useEffect(() => {
    const fetchEnquiries = async () => {
      if (!businessIds || businessIds.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch vet_partner_enquiries
        let vetEnquiries: Enquiry[] = [];
        try {
          const { data: vetData, error: vetError } = await supabase
            .from('vet_partner_enquiries' as any)
            .select('*')
            .in('business_id', businessIds)
            .order('created_at', { ascending: false });

          if (!vetError && vetData) {
            vetEnquiries = vetData.map((enq: any) => ({
              id: enq.id,
              name: enq.name,
              email: enq.email,
              phone: enq.phone,
              message: enq.message,
              read: enq.read || false,
              created_at: enq.created_at,
              source: 'vet_partner' as const,
            }));
          }
        } catch (error) {
          console.error('Error fetching vet partner enquiries:', error);
        }

        // Fetch business_enquiries
        let businessEnquiries: Enquiry[] = [];
        try {
          const { data: busData, error: busError } = await supabase
            .from('business_enquiries' as any)
            .select('*')
            .in('business_id', businessIds)
            .order('created_at', { ascending: false });

          if (!busError && busData) {
            businessEnquiries = busData.map((enq: any) => ({
              id: enq.id,
              name: enq.name,
              email: enq.email,
              phone: enq.phone,
              message: enq.message,
              read: enq.read || false,
              created_at: enq.created_at,
              source: 'business' as const,
            }));
          }
        } catch (error) {
          console.error('Error fetching business enquiries:', error);
        }

        // Combine and sort by date
        const allEnquiries = [...vetEnquiries, ...businessEnquiries].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setEnquiries(allEnquiries);
      } catch (error: any) {
        console.error('Error fetching enquiries:', error);
        toast({
          title: "Error",
          description: "Failed to load enquiries.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (businessIds.length > 0) {
      fetchEnquiries();
    }
  }, [businessIds, toast]);

  // Toggle read status
  const toggleReadStatus = async (enquiryId: string, currentRead: boolean, source: 'vet_partner' | 'business') => {
    try {
      const tableName = source === 'vet_partner' ? 'vet_partner_enquiries' : 'business_enquiries';
      
      const { error } = await supabase
        .from(tableName as any)
        .update({ read: !currentRead })
        .eq('id', enquiryId);

      if (error) throw error;

      // Update local state
      setEnquiries(enquiries.map(enq => 
        enq.id === enquiryId ? { ...enq, read: !currentRead } : enq
      ));

      toast({
        title: "Success",
        description: `Enquiry marked as ${!currentRead ? 'read' : 'unread'}.`,
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error updating read status:', error);
      toast({
        title: "Error",
        description: "Failed to update enquiry status.",
        variant: "destructive"
      });
    }
  };

  // Filter enquiries
  const filteredEnquiries = enquiries.filter(enq => {
    if (filter === 'read') return enq.read;
    if (filter === 'unread') return !enq.read;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEnquiries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEnquiries = filteredEnquiries.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12">
            <LoadingSpinner 
              size="lg" 
              label="Loading enquiries..." 
              fullPage={false}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enquiries</h1>
          <p className="text-muted-foreground">
            View and manage customer enquiries for your business listings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({enquiries.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread ({enquiries.filter(e => !e.read).length})
          </Button>
          <Button
            variant={filter === 'read' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('read')}
          >
            Read ({enquiries.filter(e => e.read).length})
          </Button>
        </div>
      </div>

      {paginatedEnquiries.length > 0 ? (
        <>
          <div className="space-y-4">
            {paginatedEnquiries.map((enquiry) => (
              <Card 
                key={enquiry.id} 
                className={!enquiry.read ? 'border-l-4 border-l-brand-soft-green bg-brand-soft-green/5' : ''}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{enquiry.name}</CardTitle>
                        {!enquiry.read && (
                          <Badge variant="default" className="bg-brand-soft-green">
                            New
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {enquiry.source === 'vet_partner' ? 'Vet Partner' : 'Business'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${enquiry.email}`} className="hover:underline">
                            {enquiry.email}
                          </a>
                        </div>
                        {enquiry.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${enquiry.phone}`} className="hover:underline">
                              {enquiry.phone}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(enquiry.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleReadStatus(enquiry.id, enquiry.read, enquiry.source)}
                      className="flex items-center gap-2"
                    >
                      {enquiry.read ? (
                        <>
                          <Circle className="h-4 w-4" />
                          Mark Unread
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Mark Read
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base whitespace-pre-wrap">
                    {enquiry.message}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Card>
              <CardContent className="p-0">
                <AdminTablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredEnquiries.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  showItemsPerPage={true}
                />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="flex flex-col items-center p-12">
          <Mail className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No enquiries yet</h3>
          <p className="text-muted-foreground text-center">
            {filter === 'all' 
              ? "You haven't received any enquiries yet. Enquiries will appear here once customers contact you."
              : filter === 'unread'
              ? "You have no unread enquiries."
              : "You have no read enquiries."
            }
          </p>
        </Card>
      )}
    </div>
  );
}
