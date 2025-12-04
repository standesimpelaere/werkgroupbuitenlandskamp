import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://jitrnfvkfvarqxllhycf.supabase.co';
// We need service role key for ALTER TABLE, but we'll try with anon key first
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdHJuZnZrZnZhcnF4bGxoeWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MDIxNTksImV4cCI6MjA3OTA3ODE1OX0.2EVYBeKXDegFFpoSsdXFmfjPR3XAiF8eKHvtfHMs--o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sql = readFileSync('kost_van_bus_migration.sql', 'utf8');

// Split SQL into individual statements
const statements = sql.split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log('Migration statements to execute:');
statements.forEach((stmt, i) => {
  console.log(`${i + 1}. ${stmt.substring(0, 60)}...`);
});

console.log('\nNote: ALTER TABLE requires service role key or SQL editor access.');
console.log('Please execute the SQL in kost_van_bus_migration.sql in Supabase SQL Editor.');
