-- Trigger to notify business owner when a review is submitted
-- Fires when business_reviews record is inserted

CREATE OR REPLACE FUNCTION public.notify_business_review_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_user_id uuid;
  business_name text;
BEGIN
  -- Get business owner user_id and business name
  SELECT user_id, name INTO business_user_id, business_name
  FROM public.business_listings
  WHERE id = NEW.business_id;

  IF business_user_id IS NOT NULL THEN
    -- Insert notification for business owner
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      listing_id,
      listing_type,
      read,
      created_at,
      updated_at
    )
    VALUES (
      business_user_id,
      'New Review Received',
      COALESCE(
        '"' || COALESCE(NEW.reviewer_name, 'Anonymous') || '" left a ' || NEW.rating || '-star review' || 
        CASE 
          WHEN NEW.comment IS NOT NULL AND NEW.comment != '' THEN ': "' || LEFT(NEW.comment, 100) || CASE WHEN LENGTH(NEW.comment) > 100 THEN '...' ELSE '' END || '"'
          ELSE ''
        END,
        'You received a new review'
      ),
      'business_review_submitted',
      NEW.id,
      'business_review',
      false,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_business_review_submitted ON public.business_reviews;

CREATE TRIGGER trigger_notify_business_review_submitted
  AFTER INSERT ON public.business_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_business_review_submitted();

-- Add comment to function
COMMENT ON FUNCTION public.notify_business_review_submitted() IS 'Automatically creates a notification for the business owner when a review is submitted';
