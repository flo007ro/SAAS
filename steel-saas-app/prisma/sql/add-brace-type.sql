-- Additive and idempotent. Does not update or delete any existing records.
ALTER TYPE "DesignRunType" ADD VALUE IF NOT EXISTS 'brace';
