-- Migration: Add kost_van_bus column to kosten tables
-- This column indicates if a cost item should be counted as "extra" bus cost

-- Add column to kosten_concrete
ALTER TABLE kosten_concrete 
ADD COLUMN IF NOT EXISTS kost_van_bus BOOLEAN DEFAULT false;

-- Add column to kosten_sandbox
ALTER TABLE kosten_sandbox 
ADD COLUMN IF NOT EXISTS kost_van_bus BOOLEAN DEFAULT false;

-- Add column to kosten_sandbox2
ALTER TABLE kosten_sandbox2 
ADD COLUMN IF NOT EXISTS kost_van_bus BOOLEAN DEFAULT false;

