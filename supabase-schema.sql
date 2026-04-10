-- ============================================================
-- AgentFlow — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  professional_role TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Documents ───────────────────────────────────────────────
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  filename TEXT NOT NULL,
  file_size INT,
  status TEXT CHECK(status IN ('uploading','processing','complete','failed')),
  progress INT DEFAULT 0,
  summary TEXT,
  error_message TEXT,
  batch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Reports ─────────────────────────────────────────────────
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents,
  user_id UUID REFERENCES auth.users,
  title TEXT,
  content JSONB,
  extraction_accuracy FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports   ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/write their own row
CREATE POLICY "own_profiles" ON profiles
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Documents: users only see their own rows
CREATE POLICY "own_documents" ON documents
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reports: users only see their own rows
CREATE POLICY "own_reports" ON reports
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Storage Bucket ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: users can upload to their own folder
CREATE POLICY "user_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: users can read their own files
CREATE POLICY "user_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Auto-create profile on signup ───────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
