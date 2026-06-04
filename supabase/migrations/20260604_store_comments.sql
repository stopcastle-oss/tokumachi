CREATE TABLE IF NOT EXISTS store_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id TEXT NOT NULL REFERENCES stores(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE store_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "누구나 조회 가능" ON store_comments FOR SELECT USING (true);
CREATE POLICY "로그인 유저만 등록 가능" ON store_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_store_comments_store_id ON store_comments(store_id);
CREATE INDEX IF NOT EXISTS idx_store_comments_created_at ON store_comments(created_at DESC);
