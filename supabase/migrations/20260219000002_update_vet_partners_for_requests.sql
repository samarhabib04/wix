-- Add request_id field to vet_partners table to track request origin

ALTER TABLE public.vet_partners
ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.vet_partner_requests(id) ON DELETE SET NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_vet_partners_request_id ON public.vet_partners(request_id);
