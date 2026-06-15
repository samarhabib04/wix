-- Update showcase expiration from 3 minutes to 15 minutes

-- Function to check if showcase listing is expired (15+ minutes old based on created_at)
CREATE OR REPLACE FUNCTION public.is_showcase_expired(created_timestamp TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (NOW() - created_timestamp) >= INTERVAL '15 minutes'; -- 15 minutes expiration
END;
$$;

-- Update the notification message in process_expired_showcases function
CREATE OR REPLACE FUNCTION public.process_expired_showcases()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
BEGIN
  -- Ensure expired flag is updated and timestamped
  PERFORM public.update_expired_showcases();

  -- Unpublish showcases that are expired and still published
  UPDATE public.showcase_listings s
  SET 
    is_published = FALSE,
    updated_at = now()
  WHERE 
    s.is_published = TRUE
    AND s.converted_to_sale_id IS NULL
    AND s.created_at IS NOT NULL
    AND public.is_showcase_expired(s.created_at) = TRUE;

  -- Create notifications for sellers whose showcases just expired (avoid duplicates)
  INSERT INTO public.notifications (user_id, title, message, listing_type, listing_id, type)
  SELECT 
    s.seller_id,
    'Showcase expired'::text,
    'Your puppy showcase has reached 15 minutes and has been taken down. You can convert it to a sale listing now.'::text,
    'showcase'::text,
    s.id,
    'expired_showcase'::text
  FROM public.showcase_listings s
  WHERE 
    s.converted_to_sale_id IS NULL
    AND s.created_at IS NOT NULL
    AND public.is_showcase_expired(s.created_at) = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.listing_id = s.id AND n.type = 'expired_showcase'
    );
END;
$$;
