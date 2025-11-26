-- Roadmap Feature Database Schema
-- Run this SQL in your Supabase SQL editor to create the required tables

-- Table: werkgroep_roadmap_waves
CREATE TABLE IF NOT EXISTS werkgroep_roadmap_waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: werkgroep_roadmap_items
CREATE TABLE IF NOT EXISTS werkgroep_roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  wave_id UUID NOT NULL REFERENCES werkgroep_roadmap_waves(id) ON DELETE CASCADE,
  theme TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Te doen', 'Mee bezig', 'Klaar')),
  task_id UUID REFERENCES werkgroep_tasks(id) ON DELETE SET NULL,
  assignee_id TEXT,
  due_date DATE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: werkgroep_roadmap_themes
CREATE TABLE IF NOT EXISTS werkgroep_roadmap_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default themes
INSERT INTO werkgroep_roadmap_themes (name, icon, color, "order") VALUES
  ('Campings', 'camping', '#3b82f6', 1),
  ('Vervoer', 'directions_bus', '#10b981', 2),
  ('Activiteiten', 'sports_soccer', '#f59e0b', 3),
  ('Voeding', 'restaurant', '#ef4444', 4),
  ('Administratie', 'description', '#8b5cf6', 5),
  ('Communicatie', 'chat', '#06b6d4', 6),
  ('Algemeen', 'folder', '#6b7280', 7)
ON CONFLICT (name) DO NOTHING;

-- Insert default waves
INSERT INTO werkgroep_roadmap_waves (name, "order") VALUES
  ('6+ maanden voor kamp', 1),
  ('3-6 maanden voor kamp', 2),
  ('1-3 maanden voor kamp', 3),
  ('Laatste maand', 4)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roadmap_items_wave_id ON werkgroep_roadmap_items(wave_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_theme ON werkgroep_roadmap_items(theme);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_task_id ON werkgroep_roadmap_items(task_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_waves_order ON werkgroep_roadmap_waves("order");

-- Run this SQL in your Supabase SQL editor to create the required tables

-- Table: werkgroep_roadmap_waves
CREATE TABLE IF NOT EXISTS werkgroep_roadmap_waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: werkgroep_roadmap_items
CREATE TABLE IF NOT EXISTS werkgroep_roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  wave_id UUID NOT NULL REFERENCES werkgroep_roadmap_waves(id) ON DELETE CASCADE,
  theme TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Te doen', 'Mee bezig', 'Klaar')),
  task_id UUID REFERENCES werkgroep_tasks(id) ON DELETE SET NULL,
  assignee_id TEXT,
  due_date DATE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: werkgroep_roadmap_themes
CREATE TABLE IF NOT EXISTS werkgroep_roadmap_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default themes
INSERT INTO werkgroep_roadmap_themes (name, icon, color, "order") VALUES
  ('Campings', 'camping', '#3b82f6', 1),
  ('Vervoer', 'directions_bus', '#10b981', 2),
  ('Activiteiten', 'sports_soccer', '#f59e0b', 3),
  ('Voeding', 'restaurant', '#ef4444', 4),
  ('Administratie', 'description', '#8b5cf6', 5),
  ('Communicatie', 'chat', '#06b6d4', 6),
  ('Algemeen', 'folder', '#6b7280', 7)
ON CONFLICT (name) DO NOTHING;

-- Insert default waves
INSERT INTO werkgroep_roadmap_waves (name, "order") VALUES
  ('6+ maanden voor kamp', 1),
  ('3-6 maanden voor kamp', 2),
  ('1-3 maanden voor kamp', 3),
  ('Laatste maand', 4)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roadmap_items_wave_id ON werkgroep_roadmap_items(wave_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_theme ON werkgroep_roadmap_items(theme);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_task_id ON werkgroep_roadmap_items(task_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_waves_order ON werkgroep_roadmap_waves("order");



