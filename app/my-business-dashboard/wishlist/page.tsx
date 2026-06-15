'use client';

import BusinessWishlist from '@/components/business-dashboard/BusinessWishlist';

export default function BusinessWishlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">My Wishlist</h1>
        <p className="text-muted-foreground">Manage your saved items and quiz results</p>
      </div>
      <BusinessWishlist />
    </div>
  );
}

