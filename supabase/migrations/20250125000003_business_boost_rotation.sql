-- Function to manage business boost rotation
-- When a new boost is added, deactivate the oldest boosts if we exceed max_active_boosts

CREATE OR REPLACE FUNCTION manage_business_boost_rotation()
RETURNS TRIGGER AS $$
DECLARE
  max_boosts INTEGER;
  active_count INTEGER;
  excess_count INTEGER;
BEGIN
  -- Get max_active_boosts from config (default 40)
  SELECT COALESCE(max_active_boosts, 40) INTO max_boosts
  FROM business_boost_config
  LIMIT 1;

  -- Count active paid boosts
  SELECT COUNT(*) INTO active_count
  FROM business_boosts
  WHERE is_active = true
    AND payment_status = 'paid';

  -- If we exceed the limit, deactivate the oldest boosts
  IF active_count > max_boosts THEN
    excess_count := active_count - max_boosts;
    
    -- Deactivate the oldest boosts (those with earliest boost_start_time)
    UPDATE business_boosts
    SET is_active = false,
        updated_at = now()
    WHERE id IN (
      SELECT id
      FROM business_boosts
      WHERE is_active = true
        AND payment_status = 'paid'
      ORDER BY boost_start_time ASC
      LIMIT excess_count
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run rotation check after insert
DROP TRIGGER IF EXISTS trigger_manage_business_boost_rotation ON public.business_boosts;
CREATE TRIGGER trigger_manage_business_boost_rotation
  AFTER INSERT ON public.business_boosts
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid' AND NEW.is_active = true)
  EXECUTE FUNCTION manage_business_boost_rotation();
