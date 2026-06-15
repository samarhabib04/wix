-- Add reviewed_at column to messages table for fraud alert tracking
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add reviewed_at column to fraud_logs table for fraud alert tracking
ALTER TABLE public.fraud_logs 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries on reviewed status
CREATE INDEX IF NOT EXISTS idx_messages_fraud_reviewed 
ON public.messages (reviewed_at) 
WHERE fraud_flag = true AND reviewed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fraud_logs_reviewed 
ON public.fraud_logs (reviewed_at) 
WHERE reviewed_at IS NULL;
