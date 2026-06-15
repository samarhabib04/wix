-- Migration: Add isReserved tracking to puppy_details via triggers
-- This automatically updates puppy_details when reservations change

-- Step 1: Create function to update puppy_details isReserved status
CREATE OR REPLACE FUNCTION update_puppy_reserved_status()
RETURNS TRIGGER AS $$
DECLARE
    listing_record RECORD;
    puppy_details_array JSONB;
    updated_puppy_details JSONB;
    puppy_index INT;
    puppy_obj JSONB;
    listing_id_val UUID;
    puppy_id_val TEXT;
    found_puppy BOOLEAN := FALSE;
BEGIN
    -- Get listing_id from NEW or OLD
    listing_id_val := COALESCE(NEW.listing_id, OLD.listing_id);
    
    IF listing_id_val IS NULL THEN
        RAISE NOTICE 'Trigger: listing_id is NULL, skipping';
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Get puppy_id from NEW or OLD
    puppy_id_val := COALESCE(NEW.puppy_id, OLD.puppy_id);
    
    IF puppy_id_val IS NULL OR puppy_id_val = '' THEN
        RAISE NOTICE 'Trigger: puppy_id is NULL or empty, skipping';
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Get the listing's puppy_details
    SELECT puppy_details INTO listing_record
    FROM sale_listings
    WHERE id = listing_id_val;
    
    IF listing_record.puppy_details IS NULL OR jsonb_typeof(listing_record.puppy_details) != 'array' THEN
        RAISE NOTICE 'Trigger: puppy_details is NULL or not an array for listing %', listing_id_val;
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    puppy_details_array := listing_record.puppy_details;
    
    -- Handle INSERT (new reservation)
    IF TG_OP = 'INSERT' THEN
        -- Only mark as reserved if status indicates active reservation
        IF NEW.status IN ('awaiting_confirmation', 'both_confirmed', 'pending', 'confirmed', 'completed') 
           AND NEW.puppy_id IS NOT NULL AND NEW.puppy_id != '' THEN
            
            RAISE NOTICE 'Trigger INSERT: Updating puppy_id % for listing % with status %', NEW.puppy_id, listing_id_val, NEW.status;
            
            -- Find and update the puppy in the array
            FOR puppy_index IN 0..jsonb_array_length(puppy_details_array) - 1 LOOP
                puppy_obj := puppy_details_array->puppy_index;
                
                -- Compare puppy IDs (both as text, handle nulls)
                IF puppy_obj IS NOT NULL AND (puppy_obj->>'id')::text = NEW.puppy_id::text THEN
                    RAISE NOTICE 'Trigger INSERT: Found puppy at index %, updating isReserved to true', puppy_index;
                    -- Update this puppy's isReserved status
                    puppy_obj := puppy_obj || '{"isReserved": true}'::jsonb;
                    puppy_details_array := jsonb_set(
                        puppy_details_array,
                        ARRAY[puppy_index::text],
                        puppy_obj
                    );
                    found_puppy := TRUE;
                    EXIT;
                END IF;
            END LOOP;
            
            IF NOT found_puppy THEN
                RAISE WARNING 'Trigger INSERT: Puppy with id % not found in puppy_details for listing %', NEW.puppy_id, listing_id_val;
            END IF;
        END IF;
    END IF;
    
    -- Handle UPDATE (status change)
    IF TG_OP = 'UPDATE' THEN
        IF NEW.puppy_id IS NOT NULL AND NEW.puppy_id != '' THEN
            -- Check if status changed to/from reserved
            IF (OLD.status NOT IN ('awaiting_confirmation', 'both_confirmed', 'pending', 'confirmed', 'completed')
                AND NEW.status IN ('awaiting_confirmation', 'both_confirmed', 'pending', 'confirmed', 'completed'))
                OR
               (OLD.status IN ('awaiting_confirmation', 'both_confirmed', 'pending', 'confirmed', 'completed')
                AND NEW.status NOT IN ('awaiting_confirmation', 'both_confirmed', 'pending', 'confirmed', 'completed')) THEN
                
                RAISE NOTICE 'Trigger UPDATE: Status changed from % to % for puppy_id %', OLD.status, NEW.status, NEW.puppy_id;
                
                -- Find and update the puppy
                FOR puppy_index IN 0..jsonb_array_length(puppy_details_array) - 1 LOOP
                    puppy_obj := puppy_details_array->puppy_index;
                    
                    IF puppy_obj IS NOT NULL AND (puppy_obj->>'id')::text = NEW.puppy_id::text THEN
                        IF NEW.status IN ('awaiting_confirmation', 'both_confirmed', 'pending', 'confirmed', 'completed') THEN
                            puppy_obj := puppy_obj || '{"isReserved": true}'::jsonb;
                            RAISE NOTICE 'Trigger UPDATE: Setting isReserved to true for puppy %', NEW.puppy_id;
                        ELSE
                            puppy_obj := puppy_obj || '{"isReserved": false}'::jsonb;
                            RAISE NOTICE 'Trigger UPDATE: Setting isReserved to false for puppy %', NEW.puppy_id;
                        END IF;
                        
                        puppy_details_array := jsonb_set(
                            puppy_details_array,
                            ARRAY[puppy_index::text],
                            puppy_obj
                        );
                        found_puppy := TRUE;
                        EXIT;
                    END IF;
                END LOOP;
                
                IF NOT found_puppy THEN
                    RAISE WARNING 'Trigger UPDATE: Puppy with id % not found in puppy_details', NEW.puppy_id;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- Handle DELETE (reservation cancelled)
    IF TG_OP = 'DELETE' THEN
        IF OLD.puppy_id IS NOT NULL AND OLD.puppy_id != '' THEN
            RAISE NOTICE 'Trigger DELETE: Marking puppy_id % as available', OLD.puppy_id;
            
            -- Mark puppy as available
            FOR puppy_index IN 0..jsonb_array_length(puppy_details_array) - 1 LOOP
                puppy_obj := puppy_details_array->puppy_index;
                
                IF puppy_obj IS NOT NULL AND (puppy_obj->>'id')::text = OLD.puppy_id::text THEN
                    puppy_obj := puppy_obj || '{"isReserved": false}'::jsonb;
                    puppy_details_array := jsonb_set(
                        puppy_details_array,
                        ARRAY[puppy_index::text],
                        puppy_obj
                    );
                    found_puppy := TRUE;
                    RAISE NOTICE 'Trigger DELETE: Set isReserved to false for puppy %', OLD.puppy_id;
                    EXIT;
                END IF;
            END LOOP;
            
            IF NOT found_puppy THEN
                RAISE WARNING 'Trigger DELETE: Puppy with id % not found in puppy_details', OLD.puppy_id;
            END IF;
        END IF;
    END IF;
    
    -- Update the sale_listings table only if we found and modified a puppy
    IF found_puppy OR TG_OP = 'INSERT' THEN
        UPDATE sale_listings
        SET puppy_details = puppy_details_array,
            updated_at = NOW()
        WHERE id = listing_id_val;
        
        RAISE NOTICE 'Trigger: Updated puppy_details for listing %', listing_id_val;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger for INSERT
DROP TRIGGER IF EXISTS trigger_update_puppy_reserved_on_insert ON reservations;
CREATE TRIGGER trigger_update_puppy_reserved_on_insert
AFTER INSERT ON reservations
FOR EACH ROW
WHEN (NEW.puppy_id IS NOT NULL)
EXECUTE FUNCTION update_puppy_reserved_status();

-- Step 3: Create trigger for UPDATE
DROP TRIGGER IF EXISTS trigger_update_puppy_reserved_on_update ON reservations;
CREATE TRIGGER trigger_update_puppy_reserved_on_update
AFTER UPDATE ON reservations
FOR EACH ROW
WHEN (NEW.puppy_id IS NOT NULL AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.puppy_id IS DISTINCT FROM NEW.puppy_id))
EXECUTE FUNCTION update_puppy_reserved_status();

-- Step 4: Create trigger for DELETE
DROP TRIGGER IF EXISTS trigger_update_puppy_reserved_on_delete ON reservations;
CREATE TRIGGER trigger_update_puppy_reserved_on_delete
AFTER DELETE ON reservations
FOR EACH ROW
WHEN (OLD.puppy_id IS NOT NULL)
EXECUTE FUNCTION update_puppy_reserved_status();

-- Step 5: Initialize isReserved for existing puppies based on current reservations
-- This one-time update sets isReserved for all existing puppies
UPDATE sale_listings sl
SET puppy_details = (
    SELECT jsonb_agg(
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM reservations r
                WHERE r.listing_id = sl.id
                AND r.puppy_id = (p->>'id')::text
                AND r.status IN ('awaiting_confirmation', 'both_confirmed', 'pending', 'confirmed', 'completed')
            ) THEN p || '{"isReserved": true}'::jsonb
            ELSE COALESCE(p - 'isReserved', p) || '{"isReserved": false}'::jsonb
        END
    )
    FROM jsonb_array_elements(sl.puppy_details) p
    WHERE sl.puppy_details IS NOT NULL
)
WHERE sl.puppy_details IS NOT NULL
AND jsonb_typeof(sl.puppy_details) = 'array';

-- Add comment
COMMENT ON FUNCTION update_puppy_reserved_status() IS 
'Automatically updates isReserved field in puppy_details when reservations are created, updated, or deleted';
