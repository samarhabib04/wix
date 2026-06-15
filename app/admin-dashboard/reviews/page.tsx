'use client';

import { useState, useEffect } from "react";
import { Star, Search, Filter, MoreHorizontal, ThumbsUp, ThumbsDown, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { adminToast } from "@/lib/utils/adminToast";
import TruncatedCellText from "@/components/admin-dashboard/TruncatedCellText";

interface Review {
  id: string;
  reviewer_name: string;
  business_name?: string;
  business_id?: string;
  business_type?: string;
  reviewed_user_name?: string;
  reviewed_user_id?: string;
  rating: number;
  comment: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_email?: string;
  review_type: 'business' | 'user';
}

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    averageRating: 0
  });

  // Fetch reviews from both business_reviews and user_reviews tables
  const fetchReviews = async () => {
    try {
      setIsLoading(true);

      // Fetch business reviews
      const { data: businessReviews, error: businessError } = await supabase
        .from('business_reviews')
        .select(`
          id,
          reviewer_name,
          reviewer_email,
          rating,
          comment,
          status,
          created_at,
          business_type,
          business_name,
          business_id
        `)
        .order('created_at', { ascending: false });

      if (businessError) {
        console.error('Error fetching business reviews:', businessError);
        toast(adminToast.error("Failed to fetch business reviews"));
        return;
      }

      // Fetch user reviews with reviewed user names
      const { data: userReviews, error: userError } = await supabase
        .from('user_reviews')
        .select(`
          id,
          reviewer_name,
          reviewer_email,
          rating,
          comment,
          status,
          created_at,
          reviewed_user_id,
          user_profiles!user_reviews_reviewed_user_id_fkey (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (userError) {
        console.error('Error fetching user reviews:', userError);
        toast(adminToast.error("Failed to fetch user reviews"));
        return;
      }

      // Format business reviews
      const formattedBusinessReviews: Review[] = (businessReviews || []).map((review: any) => ({
        id: review.id,
        reviewer_name: review.reviewer_name,
        reviewer_email: review.reviewer_email,
        business_name: review.business_name || 'Unknown Business',
        business_id: review.business_id,
        business_type: review.business_type || 'Unknown',
        rating: review.rating,
        comment: review.comment || '',
        created_at: review.created_at,
        status: review.status,
        review_type: 'business' as const
      }));

      // Format user reviews
      const formattedUserReviews: Review[] = (userReviews || []).map((review: any) => {
        const reviewedUser = review.user_profiles;
        const reviewedUserName = reviewedUser
          ? `${reviewedUser.first_name || ''} ${reviewedUser.last_name || ''}`.trim() || 'Anonymous User'
          : 'Anonymous User';

        return {
          id: review.id,
          reviewer_name: review.reviewer_name,
          reviewer_email: review.reviewer_email,
          reviewed_user_name: reviewedUserName,
          reviewed_user_id: review.reviewed_user_id,
          rating: review.rating,
          comment: review.comment || '',
          created_at: review.created_at,
          status: review.status,
          review_type: 'user' as const
        };
      });

      // Combine and sort all reviews
      const allReviews = [...formattedBusinessReviews, ...formattedUserReviews]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setReviews(allReviews);

      // Calculate stats
      const total = allReviews.length;
      const pending = allReviews.filter(r => r.status === 'pending').length;
      const approved = allReviews.filter(r => r.status === 'approved').length;
      const averageRating = allReviews.length > 0
        ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length
        : 0;

      setStats({ total, pending, approved, averageRating });

    } catch (error) {
      console.error('Exception fetching reviews:', error);
      toast(adminToast.error("An unexpected error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  // Update review status for both business and user reviews
  const updateReviewStatus = async (reviewId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      if (!review) return;

      const tableName = review.review_type === 'business' ? 'business_reviews' : 'user_reviews';

      const { error } = await supabase
        .from(tableName)
        .update({ status: newStatus })
        .eq('id', reviewId);

      if (error) {
        console.error('Error updating review status:', error);
        toast(adminToast.error("Failed to update review status"));
        return;
      }

      toast(adminToast.success(`Review ${newStatus} successfully`));

      // Refresh reviews
      fetchReviews();

    } catch (error) {
      console.error('Exception updating review status:', error);
      toast(adminToast.error("An unexpected error occurred"));
    }
  };

  // Delete review for both business and user reviews
  const deleteReview = async (reviewId: string) => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      if (!review) return;

      const tableName = review.review_type === 'business' ? 'business_reviews' : 'user_reviews';

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', reviewId);

      if (error) {
        console.error('Error deleting review:', error);
        toast(adminToast.error("Failed to delete review"));
        return;
      }

      toast(adminToast.success("Review deleted successfully"));

      // Refresh reviews
      fetchReviews();

    } catch (error) {
      console.error('Exception deleting review:', error);
      toast(adminToast.error("An unexpected error occurred"));
    }
  };

  const handleViewReview = (review: Review) => {
    setSelectedReview(review);
    setIsReviewDialogOpen(true);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredReviews = reviews.filter(review => {
    // Filter by tab
    if (activeTab === 'pending' && review.status !== 'pending') return false;
    if (activeTab === 'approved' && review.status !== 'approved') return false;
    if (activeTab === 'rejected' && review.status !== 'rejected') return false;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesReviewer = review.reviewer_name.toLowerCase().includes(searchLower);
      const matchesBusiness = review.business_name?.toLowerCase().includes(searchLower);
      const matchesUser = review.reviewed_user_name?.toLowerCase().includes(searchLower);
      const matchesComment = review.comment.toLowerCase().includes(searchLower);

      if (!matchesReviewer && !matchesBusiness && !matchesUser && !matchesComment) {
        return false;
      }
    }

    // Filter by status
    if (filterStatus !== "all" && review.status !== filterStatus) {
      return false;
    }

    return true;
  });

  // Status badge renderer
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default">Approved</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Star rating renderer
  const getStarRating = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star key={i} className={`h-4 w-4 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
      );
    }
    return <div className="flex">{stars}</div>;
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Review Management</h2>
        <div className="flex items-center gap-2">
          <Button onClick={fetchReviews} disabled={isLoading} size="sm" className="text-xs sm:text-sm">
            <Filter className="w-4 h-4 mr-2" />
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All Reviews</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs sm:text-sm">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs sm:text-sm">Rejected</TabsTrigger>
          </TabsList>

          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search reviews..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="all" className="mt-6">
            <ReviewsTable
              reviews={filteredReviews}
              getStatusBadge={getStatusBadge}
              getStarRating={getStarRating}
              onApprove={updateReviewStatus}
              onReject={updateReviewStatus}
              onDelete={deleteReview}
              onViewReview={handleViewReview}
              isLoading={isLoading}
            />
          </TabsContent>
          <TabsContent value="pending" className="mt-6">
            <ReviewsTable
              reviews={filteredReviews.filter(r => r.status === 'pending')}
              getStatusBadge={getStatusBadge}
              getStarRating={getStarRating}
              onApprove={updateReviewStatus}
              onReject={updateReviewStatus}
              onDelete={deleteReview}
              onViewReview={handleViewReview}
              isLoading={isLoading}
            />
          </TabsContent>
          <TabsContent value="approved" className="mt-6">
            <ReviewsTable
              reviews={filteredReviews.filter(r => r.status === 'approved')}
              getStatusBadge={getStatusBadge}
              getStarRating={getStarRating}
              onApprove={updateReviewStatus}
              onReject={updateReviewStatus}
              onDelete={deleteReview}
              onViewReview={handleViewReview}
              isLoading={isLoading}
            />
          </TabsContent>
          <TabsContent value="rejected" className="mt-6">
            <ReviewsTable
              reviews={filteredReviews.filter(r => r.status === 'rejected')}
              getStatusBadge={getStatusBadge}
              getStarRating={getStarRating}
              onApprove={updateReviewStatus}
              onReject={updateReviewStatus}
              onDelete={deleteReview}
              onViewReview={handleViewReview}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium">Total Reviews</h3>
              <p className="text-3xl font-bold mt-2">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium">Pending Reviews</h3>
              <p className="text-3xl font-bold mt-2 text-amber-500">
                {stats.pending}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium">Approved Reviews</h3>
              <p className="text-3xl font-bold mt-2 text-green-500">
                {stats.approved}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium">Avg. Rating</h3>
              <p className="text-3xl font-bold mt-2 text-blue-500">
                {stats.averageRating.toFixed(1)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Details Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{selectedReview.reviewer_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{selectedReview.reviewer_name}</h3>
                  <p className="text-sm text-gray-500">{selectedReview.reviewer_email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Review Target</p>
                  <p>{selectedReview.review_type === 'business' ? selectedReview.business_name : selectedReview.reviewed_user_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Review Type</p>
                  <Badge variant="outline" className="mt-1">
                    {selectedReview.review_type === 'business' ? selectedReview.business_type : 'User Review'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Rating</p>
                  <div className="flex items-center gap-2">
                    {getStarRating(selectedReview.rating)}
                    <span className="text-sm text-gray-500">({selectedReview.rating}/5)</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p>{new Date(selectedReview.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  {getStatusBadge(selectedReview.status)}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Review Comment</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed">
                    {selectedReview.comment || "No comment provided"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                {selectedReview.status !== 'approved' && (
                  <Button
                    onClick={() => {
                      updateReviewStatus(selectedReview.id, 'approved');
                      setIsReviewDialogOpen(false);
                    }}
                    className="flex-1"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Approve Review
                  </Button>
                )}
                {selectedReview.status !== 'rejected' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateReviewStatus(selectedReview.id, 'rejected');
                      setIsReviewDialogOpen(false);
                    }}
                    className="flex-1"
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Reject Review
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Updated Reviews Table component to handle both business and user reviews
const ReviewsTable = ({
  reviews,
  getStatusBadge,
  getStarRating,
  onApprove,
  onReject,
  onDelete,
  onViewReview,
  isLoading
}: {
  reviews: Review[],
  getStatusBadge: (status: string) => React.ReactNode,
  getStarRating: (rating: number) => React.ReactNode,
  onApprove: (id: string, status: 'approved') => void,
  onReject: (id: string, status: 'rejected') => void,
  onDelete: (id: string) => void,
  onViewReview: (review: Review) => void,
  isLoading: boolean
}) => {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <Table className="table-fixed min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] sm:w-[80px] text-xs sm:text-sm">ID</TableHead>
                  <TableHead className="text-xs sm:text-sm">Reviewer</TableHead>
                  <TableHead className="text-xs sm:text-sm">Target</TableHead>
                  <TableHead className="text-xs sm:text-sm">Type</TableHead>
                  <TableHead className="text-xs sm:text-sm">Rating</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Comment</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                        <p className="text-muted-foreground">Loading reviews...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <div className="rounded-full bg-brand-light-green/20 p-3 mb-4">
                          <Star className="h-8 w-8 text-brand-dark-green" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">No Reviews Yet</h3>
                        <p className="text-muted-foreground max-w-sm text-center">
                          Customer reviews will appear here once users start leaving feedback for businesses and other users on your platform.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        <TruncatedCellText text={review.id.substring(0, 8)} maxChars={8} className="max-w-[72px]" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                            <AvatarFallback className="text-xs">{review.reviewer_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <TruncatedCellText text={review.reviewer_name} maxChars={20} className="text-xs sm:text-sm max-w-[120px] sm:max-w-[180px]" />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <TruncatedCellText
                          text={review.review_type === 'business' ? review.business_name : review.reviewed_user_name}
                          maxChars={24}
                          className="max-w-[140px] sm:max-w-[200px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          {review.review_type === 'business' ? review.business_type : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell><div className="scale-75 sm:scale-100 origin-left">{getStarRating(review.rating)}</div></TableCell>
                      <TableCell className="max-w-xs hidden sm:table-cell">
                        <div className="truncate">
                          {review.comment ? (
                            <span className="text-xs sm:text-sm text-gray-600">
                              {review.comment.length > 50
                                ? `${review.comment.substring(0, 50)}...`
                                : review.comment}
                            </span>
                          ) : (
                            <span className="text-xs sm:text-sm text-gray-400 italic">No comment</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden md:table-cell">{new Date(review.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><div className="scale-90 sm:scale-100 origin-left">{getStatusBadge(review.status)}</div></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onViewReview(review)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Full Review
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {review.status !== 'approved' && (
                              <DropdownMenuItem onClick={() => onApprove(review.id, 'approved')}>
                                <ThumbsUp className="h-4 w-4 mr-2 text-green-500" />
                                Approve Review
                              </DropdownMenuItem>
                            )}
                            {review.status !== 'rejected' && (
                              <DropdownMenuItem onClick={() => onReject(review.id, 'rejected')}>
                                <ThumbsDown className="h-4 w-4 mr-2 text-red-500" />
                                Reject Review
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => onDelete(review.id)}
                            >
                              Delete Review
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};




























