-- PL/pgSQL Functions for TokuMachi

-- Function to register price and award points in a single transaction
CREATE OR REPLACE FUNCTION register_price_and_award_points(
  p_store_id TEXT,
  p_item_id UUID,
  p_user_id UUID,
  p_price INTEGER,
  p_image_url TEXT DEFAULT NULL
)
RETURNS TABLE (entry_id UUID, points_awarded INTEGER) AS $$
DECLARE
  v_entry_id UUID;
  v_points INTEGER := 5; -- Base points for text entry
  v_is_pioneer BOOLEAN;
BEGIN
  -- Create price entry
  INSERT INTO price_entries (store_id, item_id, user_id, price, image_url, status)
  VALUES (p_store_id, p_item_id, p_user_id, p_price, p_image_url, 'active')
  RETURNING id INTO v_entry_id;

  -- Award bonus points if image is included
  IF p_image_url IS NOT NULL THEN
    v_points := 10;
  END IF;

  -- Check if user is pioneer (first to register at this store)
  SELECT NOT EXISTS(
    SELECT 1 FROM price_entries
    WHERE store_id = p_store_id AND user_id != p_user_id
  ) INTO v_is_pioneer;

  IF v_is_pioneer THEN
    v_points := v_points + 100;

    -- Insert pioneer badge
    INSERT INTO user_badges (user_id, badge_name)
    VALUES (p_user_id, 'pioneer')
    ON CONFLICT (user_id, badge_name) DO NOTHING;
  END IF;

  -- Update user points
  UPDATE profiles
  SET total_points = total_points + v_points
  WHERE id = p_user_id;

  -- Log point transaction
  INSERT INTO point_logs (user_id, points, reason, price_entry_id)
  VALUES (
    p_user_id,
    v_points,
    CASE
      WHEN v_is_pioneer THEN 'Price registration (pioneer)'
      WHEN p_image_url IS NOT NULL THEN 'Price registration with image'
      ELSE 'Price registration'
    END,
    v_entry_id
  );

  RETURN QUERY SELECT v_entry_id, v_points;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle like and award points to entry creator
CREATE OR REPLACE FUNCTION toggle_like(
  p_price_entry_id UUID,
  p_user_id UUID
)
RETURNS TABLE (is_liked BOOLEAN, new_like_count INTEGER) AS $$
DECLARE
  v_entry_user_id UUID;
  v_already_liked BOOLEAN;
  v_like_count INTEGER;
BEGIN
  -- Prevent users from liking their own entries
  SELECT user_id INTO v_entry_user_id FROM price_entries WHERE id = p_price_entry_id;

  IF v_entry_user_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot like your own entry';
  END IF;

  -- Check if already liked
  SELECT EXISTS(SELECT 1 FROM likes WHERE price_entry_id = p_price_entry_id AND user_id = p_user_id)
  INTO v_already_liked;

  IF v_already_liked THEN
    -- Remove like
    DELETE FROM likes WHERE price_entry_id = p_price_entry_id AND user_id = p_user_id;

    -- Decrement like count
    UPDATE price_entries SET like_count = like_count - 1 WHERE id = p_price_entry_id;
  ELSE
    -- Add like
    INSERT INTO likes (price_entry_id, user_id) VALUES (p_price_entry_id, p_user_id);

    -- Increment like count
    UPDATE price_entries SET like_count = like_count + 1 WHERE id = p_price_entry_id;

    -- Award 2 points to entry creator
    UPDATE profiles SET total_points = total_points + 2 WHERE id = v_entry_user_id;

    INSERT INTO point_logs (user_id, points, reason, price_entry_id)
    VALUES (v_entry_user_id, 2, 'Like received', p_price_entry_id);
  END IF;

  -- Get current like count
  SELECT like_count INTO v_like_count FROM price_entries WHERE id = p_price_entry_id;

  RETURN QUERY SELECT NOT v_already_liked, v_like_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get nearby stores using PostGIS
CREATE OR REPLACE FUNCTION get_nearby_stores(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id TEXT,
  name_ja TEXT,
  name_ko TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name_ja,
    s.name_ko,
    s.address,
    s.latitude,
    s.longitude,
    CAST(ST_Distance(s.geom, ST_GeogFromText(
      'SRID=4326;POINT(' || p_longitude || ' ' || p_latitude || ')')
    ) AS INTEGER) as distance_meters
  FROM stores s
  WHERE ST_DWithin(
    s.geom,
    ST_GeogFromText('SRID=4326;POINT(' || p_longitude || ' ' || p_latitude || ')'),
    p_radius_meters
  )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old entries (should be called by cron)
CREATE OR REPLACE FUNCTION archive_old_entries()
RETURNS TABLE (archived_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE price_entries
  SET status = 'archived'
  WHERE status != 'archived'
    AND created_at < NOW() - INTERVAL '14 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update user title based on points (trigger)
CREATE OR REPLACE FUNCTION update_user_title()
RETURNS TRIGGER AS $$
BEGIN
  NEW.title := CASE
    WHEN NEW.total_points >= 5000 THEN '伝説のショッパー'
    WHEN NEW.total_points >= 2000 THEN '街の物価王'
    WHEN NEW.total_points >= 500 THEN '節約マスター'
    WHEN NEW.total_points >= 100 THEN '価格探偵'
    ELSE '駆け出しショッパー'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for title update (idempotent)
DROP TRIGGER IF EXISTS update_user_title_trigger ON profiles;
CREATE TRIGGER update_user_title_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_title();

-- Function to get dashboard stats
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
    SELECT id, price, like_count, created_at, store_id, item_id
    FROM price_entries
    WHERE status = 'active'
    ORDER BY like_count DESC
    LIMIT 5
  ) t;

  RETURN QUERY SELECT v_today_count, v_trending, v_top_liked;
END;
$$ LANGUAGE plpgsql;
