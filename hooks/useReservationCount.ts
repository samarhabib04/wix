'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useReservationCount() {
    const { user, role } = useAuth();
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        const fetchCount = async () => {
            try {
                if (role === 'seller') {
                    // Count reservations awaiting confirmation for this seller's listings
                    // We need to join with sale_listings to filter by seller_id
                    const { count: reservationCount, error } = await supabase
                        .from('reservations')
                        .select('id, status, sale_listings!inner(seller_id)', { count: 'exact', head: true })
                        .eq('sale_listings.seller_id', user.id)
                        .eq('status', 'awaiting_confirmation');

                    if (!error && reservationCount !== null) {
                        setCount(reservationCount);
                    }
                } else if (role === 'admin') {
                    // Count disputed reservations or those needing admin attention
                    const { count: reservationCount, error } = await supabase
                        .from('reservations')
                        .select('id', { count: 'exact', head: true })
                        .or('status.eq.disputed,admin_confirmed.is.null');
                    // Adjust logic based on what exactly Admin needs to see. 
                    // Often it's status='disputed' OR status='awaiting_admin_review' etc.
                    // For now, let's count 'disputed' ones.

                    const { count: disputedCount } = await supabase
                        .from('reservations')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'disputed');

                    if (disputedCount !== null) {
                        setCount(disputedCount);
                    }
                }
            } catch (error) {
                console.error('Error fetching reservation count:', error);
            }
        };

        fetchCount();

        // Set up realtime subscription
        const channel = supabase
            .channel('reservation-badges')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reservations'
                },
                () => {
                    fetchCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, role]);

    return count;
}
