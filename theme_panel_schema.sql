-- Theme Panel Database Schema
-- Adds country field to roadmap items and creates theme-level tables

-- Add country field to roadmap items
ALTER TABLE werkgroep_roadmap_items
ADD COLUMN IF NOT EXISTS country TEXT CHECK (country IN ('Nederland', 'België', 'Frankrijk'));

-- Add notes and steps columns if not already added
ALTER TABLE werkgroep_roadmap_items
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb;

-- Table: werkgroep_theme_notes
CREATE TABLE IF NOT EXISTS werkgroep_theme_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country IN ('Nederland', 'België', 'Frankrijk')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: werkgroep_theme_contributions
CREATE TABLE IF NOT EXISTS werkgroep_theme_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country IN ('Nederland', 'België', 'Frankrijk')),
  content TEXT NOT NULL,
  author_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: werkgroep_theme_attachments
CREATE TABLE IF NOT EXISTS werkgroep_theme_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country IN ('Nederland', 'België', 'Frankrijk')),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('file', 'link')),
  url TEXT NOT NULL,
  size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_theme_notes_theme_country ON werkgroep_theme_notes(theme, country);
CREATE INDEX IF NOT EXISTS idx_theme_contributions_theme_country ON werkgroep_theme_contributions(theme, country);
CREATE INDEX IF NOT EXISTS idx_theme_attachments_theme_country ON werkgroep_theme_attachments(theme, country);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_country ON werkgroep_roadmap_items(country);

