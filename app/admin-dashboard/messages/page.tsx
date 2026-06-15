'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Flag, Search, Filter, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import AdminTable, { TableColumn, TableAction } from '@/components/admin-dashboard/AdminTable';
import TruncatedCellText from '@/components/admin-dashboard/TruncatedCellText';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { messageSenderDisplayName } from '@/lib/utils/message-sender-display-name';

interface AdminMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: string;
  created_at: string;
  moderation_status: string;
  moderation_notes?: string | null;
  fraud_flag: boolean;
  fraud_keywords?: string[] | null;
  sender_name?: string;
  recipient_name?: string;
}

export default function AdminMessagesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [fraudFilter, setFraudFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [sortColumn, setSortColumn] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const MESSAGES_PER_PAGE = 50;

  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      // Calculate offset for pagination
      const offset = (currentPage - 1) * MESSAGES_PER_PAGE;
      
      // Build base query
      let query = supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .order(sortColumn, { ascending: sortDirection === 'asc' })
        .range(offset, offset + MESSAGES_PER_PAGE - 1);

      // Apply search filter
      if (searchTerm) {
        query = query.ilike('content', `%${searchTerm}%`);
      }

      // Apply user filter
      if (userFilter) {
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('id')
          .or(`first_name.ilike.%${userFilter}%,last_name.ilike.%${userFilter}%`);
        
        if (userProfiles && userProfiles.length > 0) {
          const userIds = userProfiles.map(u => u.id);
          query = query.or(`sender_id.in.(${userIds.join(',')}),recipient_id.in.(${userIds.join(',')})`);
        }
      }

      // Apply fraud filter
      if (fraudFilter === 'flagged') {
        query = query.eq('fraud_flag', true);
      } else if (fraudFilter === 'not_flagged') {
        query = query.eq('fraud_flag', false);
      }

      const { data: messagesData, error: messagesError, count } = await query;

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }

      // Get unique user IDs from messages
      const userIds = new Set<string>();
      messagesData?.forEach(msg => {
        userIds.add(msg.sender_id);
        userIds.add(msg.recipient_id);
      });

      // Fetch user profiles for these IDs
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, role, is_admin')
        .in('id', Array.from(userIds));

      // Create a lookup map for user names (admins show as "Admin")
      const userLookup = (userProfiles || []).reduce((acc, profile) => {
        acc[profile.id] = messageSenderDisplayName(profile, 'Unknown User');
        return acc;
      }, {} as Record<string, string>);

      // Enrich messages with user names
      const enrichedMessages = (messagesData || []).map(msg => ({
        ...msg,
        sender_name: userLookup[msg.sender_id] || 'Unknown User',
        recipient_name: userLookup[msg.recipient_id] || 'Unknown User'
      }));

      setMessages(enrichedMessages);
      setTotalMessages(count || 0);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Define table columns
  const columns: TableColumn[] = [
    {
      key: 'sender_name',
      label: 'Sender',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <TruncatedCellText text={value} maxChars={20} className="font-medium max-w-[160px]" />
          {row.fraud_flag && (
            <Badge variant="destructive" className="text-xs flex-shrink-0">
              <Flag className="h-3 w-3 mr-1" />
              Fraud
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'recipient_name',
      label: 'Receiver',
      sortable: true
    },
    {
      key: 'content',
      label: 'Excerpt',
      render: (value) => (
        <TruncatedCellText text={value} maxChars={80} className="max-w-xs" />
      )
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (value) => formatDistanceToNow(new Date(value), { addSuffix: true })
    },
    {
      key: 'message_type',
      label: 'Type',
      render: (value) => (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      )
    }
  ];

  // Define table actions
  const actions: TableAction[] = [
    {
      label: "View Conversation",
      onClick: (row) => router.push(`/admin-dashboard/messages/${row.conversation_id}`),
    }
  ];

  const totalPages = Math.ceil(totalMessages / MESSAGES_PER_PAGE);
  const flaggedMessages = messages.filter(msg => msg.fraud_flag);

  useEffect(() => {
    fetchMessages();
  }, [currentPage, searchTerm, userFilter, fraudFilter, sortColumn, sortDirection]);

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortColumn(column);
    setSortDirection(direction);
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-berkshire text-brand-dark-green">Messages Dashboard</h2>
          <p className="text-muted-foreground">Monitor all messages with pagination, search, and fraud detection</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Messages</p>
                <p className="text-2xl font-bold">{totalMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Flag className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium">Fraud Flagged</p>
                <p className="text-2xl font-bold text-destructive">{flaggedMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Page {currentPage} of {totalPages}</p>
                <p className="text-2xl font-bold text-orange-600">{MESSAGES_PER_PAGE} per page</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search message content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Input
              placeholder="Filter by user name..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="md:w-48"
            />
            
            <Select value={fraudFilter} onValueChange={setFraudFilter}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Fraud Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="flagged">Fraud Flagged</SelectItem>
                <SelectItem value="not_flagged">Not Flagged</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setUserFilter("");
                setFraudFilter("all");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <AdminTable
        data={messages}
        columns={columns}
        actions={actions}
        isLoading={loading}
        emptyMessage="No messages found. Try adjusting your search filters."
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
      />

      {/* Pagination */}
      <div className="flex justify-center mt-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) handlePageChange(currentPage - 1);
                }}
                className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const page = Math.max(1, currentPage - 2) + i;
              if (page > totalPages) return null;
              
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page);
                    }}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) handlePageChange(currentPage + 1);
                }}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}



