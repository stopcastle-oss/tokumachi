-- Deduplicate top_liked_entries: show only the latest entry per (store_id, item_id)
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

  -- DISTINCT ON (store_id, item_id): keep only the most recent entry per store+item pair
  SELECT json_agg(row_to_json(t)) INTO v_top_liked
  FROM (
    SELECT * FROM (
      SELECT DISTINCT ON (pe.store_id, pe.item_id)
        pe.id,
        pe.price,
        pe.like_count,
        pe.created_at,
        pe.store_id,
        pe.item_id,
        i.name_ja AS item_name,
        s.name_ja AS store_name,
        (SELECT COUNT(*) FROM price_verifications pv
          WHERE pv.price_entry_id = pe.id AND pv.is_correct = true)::INTEGER AS correct_count,
        (SELECT COUNT(*) FROM price_verifications pv
          WHERE pv.price_entry_id = pe.id)::INTEGER AS total_verifications
      FROM price_entries pe
      LEFT JOIN items i ON i.id = pe.item_id
      LEFT JOIN stores s ON s.id = pe.store_id
      WHERE pe.status = 'active'
      ORDER BY pe.store_id, pe.item_id, pe.created_at DESC
    ) deduped
    ORDER BY created_at DESC
    LIMIT 20
  ) t;

  RETURN QUERY SELECT v_today_count, v_trending, v_top_liked;
END;
$$ LANGUAGE plpgsql;
