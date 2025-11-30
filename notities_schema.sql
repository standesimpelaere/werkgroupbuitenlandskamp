-- Notities Database Schema
-- Run this SQL in your Supabase SQL editor to create the required table

-- Table: notities
CREATE TABLE IF NOT EXISTS notities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('Campings', 'Vervoer', 'Activiteiten', 'Voeding', 'Administratie', 'Communicatie', 'Financiën', 'Algemeen')),
  version TEXT NOT NULL DEFAULT 'concrete',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notities_version ON notities(version);
CREATE INDEX IF NOT EXISTS idx_notities_created_at ON notities(created_at DESC);

-- Disable Row Level Security (simpler for this use case)
ALTER TABLE notities DISABLE ROW LEVEL SECURITY;

-- If you want to enable RLS later, use this instead:
-- ALTER TABLE notities ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all operations" ON notities;
-- CREATE POLICY "Allow all operations" ON notities
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);
