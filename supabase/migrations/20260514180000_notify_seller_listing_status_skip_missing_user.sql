-- Avoid notifications_user_id_fkey failures when sale_listings.seller_id has no row
-- in auth.users (deleted auth user, orphaned listing). FK: notifications.user_id -> auth.users.id

CREATE OR REPLACE FUNCTION public.notify_seller_listing_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status = 'approved' OR NEW.status = 'active' THEN
            IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.seller_id) THEN
                INSERT INTO public.notifications (user_id, title, message, type, listing_type, listing_id)
                VALUES (
                    NEW.seller_id,
                    'Listing Approved',
                    'Your listing "' || NEW.title || '" has been approved and is now live.',
                    'listing_approved',
                    'sale',
                    NEW.id
                );
            END IF;
        ELSIF NEW.status = 'rejected' THEN
            IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.seller_id) THEN
                INSERT INTO public.notifications (user_id, title, message, type, listing_type, listing_id)
                VALUES (
                    NEW.seller_id,
                    'Listing Rejected',
                    'Your listing "' || NEW.title || '" has been rejected.' ||
                    CASE
                        WHEN NEW.rejection_message IS NOT NULL
                        THEN ' Reason: ' || NEW.rejection_message
                        ELSE ''
                    END,
                    'listing_rejected',
                    'sale',
                    NEW.id
                );
            END IF;
        ELSIF NEW.status = 'pending_re_approval' THEN
            IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.seller_id) THEN
                INSERT INTO public.notifications (user_id, title, message, type, listing_type, listing_id)
                VALUES (
                    NEW.seller_id,
                    'Listing Under Review',
                    'Your updated listing "' || NEW.title || '" is under review and will be visible once approved.',
                    'listing_under_review',
                    'sale',
                    NEW.id
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;
