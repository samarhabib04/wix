-- Update vet partner tier determination based on subscription
-- Free tier: standard subscription or no active subscription
-- Paid tier: premium or elite_marketplace subscription with active status

-- Create function to determine vet partner tier from subscription
CREATE OR REPLACE FUNCTION determine_vet_partner_tier(business_id_param uuid)
RETURNS vet_partner_tier AS $$
DECLARE
  subscription_tier_val text;
  subscription_status_val text;
BEGIN
  -- Get the most recent active subscription
  SELECT subscription_tier, status
  INTO subscription_tier_val, subscription_status_val
  FROM public.business_subscriptions
  WHERE business_id = business_id_param
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Determine tier based on subscription
  IF subscription_tier_val IS NULL OR subscription_status_val IS NULL THEN
    -- No active subscription = free tier
    RETURN 'free';
  END IF;

  IF subscription_tier_val = 'standard' THEN
    -- Standard subscription = free tier
    RETURN 'free';
  END IF;

  IF subscription_tier_val IN ('premium', 'elite_marketplace') AND subscription_status_val = 'active' THEN
    -- Premium or Elite Marketplace with active status = paid tier
    RETURN 'paid';
  END IF;

  -- Default to free
  RETURN 'free';
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to update vet_partners.tier when subscription changes
CREATE OR REPLACE FUNCTION update_vet_partner_tier_on_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
  new_tier vet_partner_tier;
BEGIN
  -- Determine new tier based on subscription
  new_tier := determine_vet_partner_tier(NEW.business_id);

  -- Update vet_partners table if entry exists
  UPDATE public.vet_partners
  SET tier = new_tier,
      updated_at = NOW()
  WHERE business_id = NEW.business_id;

  -- Also update business_listings.vet_partner_tier for consistency
  UPDATE public.business_listings
  SET vet_partner_tier = new_tier
  WHERE id = NEW.business_id
    AND partner = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on business_subscriptions table
DROP TRIGGER IF EXISTS trigger_update_vet_partner_tier_on_subscription ON public.business_subscriptions;
CREATE TRIGGER trigger_update_vet_partner_tier_on_subscription
  AFTER INSERT OR UPDATE ON public.business_subscriptions
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION update_vet_partner_tier_on_subscription_change();

-- Also create trigger for when subscription is cancelled/expired
CREATE OR REPLACE FUNCTION update_vet_partner_tier_on_subscription_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  new_tier vet_partner_tier;
BEGIN
  -- If subscription is cancelled/expired, check if there's another active subscription
  IF NEW.status IN ('cancelled', 'expired') THEN
    new_tier := determine_vet_partner_tier(NEW.business_id);
    
    -- Update vet_partners table if entry exists
    UPDATE public.vet_partners
    SET tier = new_tier,
        updated_at = NOW()
    WHERE business_id = NEW.business_id;

    -- Also update business_listings.vet_partner_tier
    UPDATE public.business_listings
    SET vet_partner_tier = new_tier
    WHERE id = NEW.business_id
      AND partner = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vet_partner_tier_on_cancellation ON public.business_subscriptions;
CREATE TRIGGER trigger_update_vet_partner_tier_on_cancellation
  AFTER UPDATE ON public.business_subscriptions
  FOR EACH ROW
  WHEN (NEW.status IN ('cancelled', 'expired') AND OLD.status = 'active')
  EXECUTE FUNCTION update_vet_partner_tier_on_subscription_cancelled();

-- Add comment
COMMENT ON FUNCTION determine_vet_partner_tier(uuid) IS 'Determines vet partner tier based on business subscription: free for standard/no subscription, paid for premium/elite_marketplace with active status';
