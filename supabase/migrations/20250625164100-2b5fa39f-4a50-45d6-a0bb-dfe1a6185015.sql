
-- Add balance columns to the wallets table
ALTER TABLE public.wallets ADD COLUMN icc_balance FLOAT DEFAULT 1247.5;
ALTER TABLE public.wallets ADD COLUMN usdc_balance FLOAT DEFAULT 250.75;
