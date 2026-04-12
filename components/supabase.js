import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbXJueG12dWlqenZkZWdmZG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNzg3NDQsImV4cCI6MjA2ODk1NDc0NH0.6dkKkBWbEAooKFvQ5ucY1ILv94XfWDisVRcxBZUwB10';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


