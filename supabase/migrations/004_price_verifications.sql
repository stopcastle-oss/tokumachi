-- Price verification table (評価システム)
CREATE TABLE IF NOT EXISTS price_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_entry_id UUID NOT NULL REFERENCES price_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(price_entry_id, user_id)
);

ALTER TABLE price_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read verifications"
  ON price_verifications FOR SELECT USING (true);

CREATE POLICY "Auth users can insert verifications"
  ON price_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verification"
  ON price_verifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own verification"
  ON price_verifications FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_verifications_entry ON price_verifications(price_entry_id);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON price_verifications(user_id);

-- Update get_dashboard_stats to sort by created_at DESC (recent first)
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  today_entries_count BIGINT,
  trending_items JSON,
  top_liked_entries JSON
) AS $$
DECLARE
  v_today_count BIGINT;
  v_trending JSON;
  v_top_liked JSON;
BEGIN
  SELECT COUNT(*)::BIGINT INTO v_today_count
  FROM price_entries
  WHERE status = 'active'
    AND DATE(created_at AT TIME ZONE 'Asia/Tokyo') = CURRENT_DATE;

  SELECT json_agg(row_to_json(t)) INTO v_trending
  FROM (
    SELECT pe.item_id, i.name_ja, COUNT(*) as count
    FROM price_entries pe
    JOIN items i ON i.id = pe.item_id
    WHERE pe.status = 'active'
      AND DATE(pe.created_at AT TIME ZONE 'Asia/Tokyo') = CURRENT_DATE
    GROUP BY pe.item_id, i.name_ja
    ORDER BY count DESC
    LIMIT 5
  ) t;

  SELECT json_agg(row_to_json(t)) INTO v_top_liked
  FROM (
    SELECT
      pe.id, pe.price, pe.like_count, pe.created_at, pe.store_id, pe.item_id,
      i.name_ja AS item_name,
      s.name_ja AS store_name,
      (SELECT COUNT(*) FROM price_verifications pv WHERE pv.price_entry_id = pe.id AND pv.is_correct = true)::INTEGER AS correct_count,
      (SELECT COUNT(*) FROM price_verifications pv WHERE pv.price_entry_id = pe.id)::INTEGER AS total_verifications
    FROM price_entries pe
    LEFT JOIN items i ON i.id = pe.item_id
    LEFT JOIN stores s ON s.id = pe.store_id
    WHERE pe.status = 'active'
    ORDER BY pe.created_at DESC
    LIMIT 10
  ) t;

  RETURN QUERY SELECT v_today_count, v_trending, v_top_liked;
END;
$$ LANGUAGE plpgsql;
