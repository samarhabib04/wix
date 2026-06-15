-- Create function to create notification when a message is sent
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  listing_title TEXT;
  listing_type_val TEXT;
  conversation_data RECORD;
  is_first_message BOOLEAN;
BEGIN
  -- Get conversation details
  SELECT c.listing_id, c.listing_type, c.buyer_id, c.seller_id, c.subject
  INTO conversation_data
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  IF conversation_data IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get sender name from user_profiles (prefer business_name, then first_name + last_name)
  SELECT 
    COALESCE(
      NULLIF(TRIM(up.business_name), ''),
      NULLIF(TRIM(CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, ''))), ''),
      NULL
    )
  INTO sender_name
  FROM public.user_profiles up
  WHERE up.id = NEW.sender_id;
  
  -- If no name found in profile, try to get email from auth.users
  IF sender_name IS NULL OR sender_name = '' THEN
    SELECT COALESCE(email, 'Someone') INTO sender_name
    FROM auth.users
    WHERE id = NEW.sender_id;
  END IF;
  
  -- Final fallback
  IF sender_name IS NULL OR sender_name = '' THEN
    sender_name := 'Someone';
  END IF;

  -- Get listing title based on listing_type
  listing_type_val := conversation_data.listing_type;
  
  IF conversation_data.listing_type = 'sale' THEN
    SELECT title INTO listing_title FROM public.sale_listings WHERE id = conversation_data.listing_id;
  ELSIF conversation_data.listing_type = 'stud' THEN
    SELECT title INTO listing_title FROM public.stud_listings WHERE id = conversation_data.listing_id;
  ELSIF conversation_data.listing_type = 'showcase' THEN
    SELECT title INTO listing_title FROM public.showcase_listings WHERE id = conversation_data.listing_id;
  END IF;

  -- Use listing subject if title not found
  IF listing_title IS NULL OR listing_title = '' THEN
    listing_title := conversation_data.subject;
  END IF;

  -- Check if this is the first message in the conversation
  SELECT COUNT(*) = 1 INTO is_first_message
  FROM public.messages
  WHERE conversation_id = NEW.conversation_id;

  -- Create notification for recipient
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    read,
    listing_id,
    listing_type,
    created_at,
    updated_at
  ) VALUES (
    NEW.recipient_id,
    CASE 
      WHEN is_first_message THEN 'New conversation started'
      ELSE 'New message from ' || sender_name
    END,
    CASE 
      WHEN is_first_message THEN 'You have a new conversation about "' || COALESCE(listing_title, 'a listing') || '"'
      ELSE 'You have a new message about "' || COALESCE(listing_title, 'a listing') || '"'
    END,
    'new_message',
    false,
    conversation_data.listing_id,
    listing_type_val,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create notification when message is inserted
DROP TRIGGER IF EXISTS trigger_create_message_notification ON public.messages;
CREATE TRIGGER trigger_create_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notification();

-- Add comment to function
COMMENT ON FUNCTION public.create_message_notification() IS 'Automatically creates a notification for the recipient when a message is sent';
