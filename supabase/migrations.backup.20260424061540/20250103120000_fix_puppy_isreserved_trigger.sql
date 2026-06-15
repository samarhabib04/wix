-- Migration: Fix isReserved trigger to re-evaluate ALL puppies and add comprehensive logging
-- This ensures consistency by checking all puppies against all active reservations

-- Step 1: Drop existing triggers
DROP TRIGGER IF EXISTS trigger_update_puppy_reserved_on_insert ON reservations;
DROP TRIGGER IF EXISTS trigger_update_puppy_reserved_on_update ON reservations;
DROP TRIGGER IF EXISTS trigger_update_puppy_reserved_on_delete ON reservations;

-- Step 2: Create improved function that re-evaluates ALL puppies
CREATE OR REPLACE FUNCTION update_puppy_reserved_status()
RETURNS TRIGGER AS $$
DECLARE
    listing_record RECORD;
    puppy_details_array JSONB;
    updated_puppy_details JSONB;
    puppy_obj JSONB;
    listing_id_val UUID;
    puppy_id_val TEXT;
    current_puppy_id TEXT;
    is_currently_reserved BOOLEAN;
    active_reservation_count INT;
BEGIN
    -- Get listing_id from NEW or OLD
    listing_id_val := COALESCE(NEW.listing_id, OLD.listing_id);
    
    IF listing_id_val IS NULL THEN
        RAISE WARNING '[TRIGGER] listing_id is NULL. NEW: %, OLD: %', NEW, OLD;
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Get puppy_id from NEW or OLD for logging
    puppy_id_val := COALESCE(NEW.puppy_id, OLD.puppy_id);
    
    RAISE NOTICE '[TRIGGER %] Starting for listing_id: %, puppy_id: %, status: %', 
        TG_OP, listing_id_val, puppy_id_val, COALESCE(NEW.status, OLD.status);
    
    -- Get the listing's puppy_details
    SELECT puppy_details INTO listing_record
    FROM sale_listings
    WHERE id = listing_id_val;
    
    IF listing_record.puppy_details IS NULL OR jsonb_typeof(listing_record.puppy_details) != 'array' THEN
        RAISE WARNING '[TRIGGER] Listing % has NULL or invalid puppy_details (type: %)', 
            listing_id_val, jsonb_typeof(listing_record.puppy_details);
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    puppy_details_array := listing_record.puppy_details;
    
    -- CRITICAL FIX: Re-evaluate ALL puppies in the listing against ALL active reservations
    -- This ensures consistency even if reservations were added/updated/deleted outside of triggers
    updated_puppy_details := '[]'::jsonb;
    
    -- Loop through each puppy in puppy_details
    FOR puppy_obj IN SELECT * FROM jsonb_array_elements(puppy_details_array) LOOP
        IF puppy_obj IS NULL THEN
            CONTINUE;
        END IF;
        
        current_puppy_id := (puppy_obj->>'id')::text;
        
        IF current_puppy_id IS NULL OR current_puppy_id = '' THEN
            RAISE WARNING '[TRIGGER] Found puppy with NULL or empty id in listing %', listing_id_val;
            -- Keep the puppy but mark as not reserved if no ID
            updated_puppy_details := updated_puppy_details || (COALESCE(puppy_obj - 'isReserved', puppy_obj) || '{"isReserved": false}'::jsonb);
            CONTINUE;
        END IF;
        
        -- Check if this puppy has any active reservations
        SELECT COUNT(*) INTO active_reservation_count
        FROM reservations r
        WHERE r.listing_id = listing_id_val
        AND r.puppy_id::text = current_puppy_id
        AND r.status IN ('awaiting_confirmation', 'both_confirmed', 'pending', 'confirmed', 'completed');
        
        is_currently_reserved := (active_reservation_count > 0);
        
        -- Log the check for the puppy that triggered this (for debugging)
        IF current_puppy_id = puppy_id_val THEN
            RAISE NOTICE '[TRIGGER] Puppy % (triggered): active_reservations=%, isReserved=%', 
                current_puppy_id, active_reservation_count, is_currently_reserved;
        END IF;
        
        -- Update isReserved flag
        IF is_currently_reserved THEN
            updated_puppy_details := updated_puppy_details || (COALESCE(puppy_obj - 'isReserved', puppy_obj) || '{"isReserved": true}'::jsonb);
        ELSE
            updated_puppy_details := updated_puppy_details || (COALESCE(puppy_obj - 'isReserved', puppy_obj) || '{"isReserved": false}'::jsonb);
        END IF;
    END LOOP;
    
    -- Update the sale_listings table with the corrected puppy_details
    UPDATE sale_listings
    SET puppy_details = updated_puppy_details,
        updated_at = NOW()
    WHERE id = listing_id_val;
    
    RAISE NOTICE '[TRIGGER %] Completed. Updated puppy_details for listing %. Total puppies: %', 
        TG_OP, listing_id_val, jsonb_array_length(updated_puppy_details);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Recreate triggers
CREATE TRIGGER trigger_update_puppy_reserved_on_insert
AFTER INSERT ON reservations
FOR EACH ROW
WHEN (NEW.puppy_id IS NOT NULL AND NEW.puppy_id != '')
EXECUTE FUNCTION update_puppy_reserved_status();

CREATE TRIGGER trigger_update_puppy_reserved_on_update
AFTER UPDATE ON reservations
FOR EACH ROW
WHEN (
    NEW.puppy_id IS NOT NULL 
    AND NEW.puppy_id != ''
    AND (
        OLD.status IS DISTINCT FROM NEW.status 
        OR OLD.puppy_id IS DISTINCT FROM NEW.puppy_id
        OR OLD.listing_id IS DISTINCT FROM NEW.listing_id
    )
)
EXECUTE FUNCTION update_puppy_reserved_status();

CREATE TRIGGER trigger_update_puppy_reserved_on_delete
AFTER DELETE ON reservations
FOR EACH ROW
WHEN (OLD.puppy_id IS NOT NULL AND OLD.puppy_id != '')
EXECUTE FUNCTION update_puppy_reserved_status();

-- Step 4: Add comment
COMMENT ON FUNCTION update_puppy_reserved_status() IS 
'Automatically updates isReserved field in puppy_details for ALL puppies when reservations change. Re-evaluates all puppies against all active reservations for consistency.';
