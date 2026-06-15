-- Treat successful reserve payments as buyer confirmation (no second buyer click).
-- Backfill rows that already paid but still had buyer_confirmed = false.

UPDATE reservations
SET
  buyer_confirmed = true,
  updated_at = now()
WHERE buyer_confirmed = false
  AND stripe_payment_intent_id IS NOT NULL
  AND status = 'awaiting_confirmation';

-- Escrow begins when both parties align; seller may already have confirmed on legacy flows.
UPDATE reservations
SET
  status = 'both_confirmed',
  updated_at = now()
WHERE status = 'awaiting_confirmation'
  AND buyer_confirmed = true
  AND seller_confirmed = true;
