-- Migration: Add manual function to sync isReserved status for a listing
-- Useful for fixing existing data and testing

CREATE OR REPLACE FUNCTION sync_puppy_reserved_status(listing_uuid UUID)
RETURNS TABLE(
    puppy_id TEXT,
    puppy_name TEXT,
    was_reserved BOOLEAN,
    is_now_reserved BOOLEAN,
    active_reservations INT
) AS $$
DECLARE
    listing_record RECORD;
    puppy_details_array JSONB;
    updated_puppy_details JSONB;
    puppy_obj JSONB;
    current_puppy_id TEXT;
    is_currently_reserved BOOLEAN;
    active_reservation_count INT;
BEGIN
    -- Validate listing exists
    SELECT puppy_details INTO listing_record
    FROM sale_listings
    WHERE id = listing_uuid;
    
    IF listing_record.puppy_details IS NULL OR jsonb_typeof(listing_record.puppy_details) != 'array' THEN
        RAISE EXCEPTION 'Listing % does not exist or has invalid puppy_details', listing_uuid;
    END IF;
    
    puppy_details_array := listing_record.puppy_details;
    updated_puppy_details := '[]'::jsonb;
    
    -- Loop through each puppy and check reservation status
    FOR puppy_obj IN SELECT * FROM jsonb_array_elements(puppy_details_array) LOOP
        IF puppy_obj IS NULL THEN
            CONTINUE;
        END IF;
        
        current_puppy_id := (puppy_obj->>'id')::text;
        
        IF current_puppy_id IS NULL OR current_puppy_id = '' THEN
            -- Skip puppies without IDs
            updated_puppy_details := updated_puppy_details || (COALESCE(puppy_obj - 'isReserved', puppy_obj) || '{"isReserved": false}'::jsonb);
            CONTINUE;
        END IF;
        
        -- Count active reservations for this puppy
        SELECT COUNT(*) INTO active_reservation_count
        FROM reservations r
        WHERE r.listing_id = listing_uuid
        AND r.puppy_id::text = current_puppy_id
        AND r.status IN ('awaiting_confirmation', 'both_confirmed', 'pending', 'confirmed', 'completed');
        
        is_currently_reserved := (active_reservation_count > 0);
        
        -- Return result row - assign directly to table columns
        puppy_id := current_puppy_id;
        puppy_name := COALESCE(puppy_obj->>'color', 'Unknown');
        was_reserved := COALESCE((puppy_obj->>'isReserved')::boolean, false);
        is_now_reserved := is_currently_reserved;
        active_reservations := active_reservation_count;
        
        RETURN NEXT;
        
        -- Update isReserved flag
        IF is_currently_reserved THEN
            updated_puppy_details := updated_puppy_details || (COALESCE(puppy_obj - 'isReserved', puppy_obj) || '{"isReserved": true}'::jsonb);
        ELSE
            updated_puppy_details := updated_puppy_details || (COALESCE(puppy_obj - 'isReserved', puppy_obj) || '{"isReserved": false}'::jsonb);
        END IF;
    END LOOP;
    
    -- Update the sale_listings table
    UPDATE sale_listings
    SET puppy_details = updated_puppy_details,
        updated_at = NOW()
    WHERE id = listing_uuid;
    
    RAISE NOTICE 'Synced isReserved status for listing %. Updated % puppies.', 
        listing_uuid, jsonb_array_length(updated_puppy_details);
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION sync_puppy_reserved_status(UUID) IS 
'Manually sync isReserved status for all puppies in a listing. Returns a table showing before/after status for each puppy. Useful for debugging and fixing data inconsistencies.';
