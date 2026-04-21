-- Drop all tables and functions if they exist to clean up failed migration
DROP FUNCTION IF EXISTS get_nearby_stores(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS toggle_like(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS register_price_and_award_points(TEXT, UUID, UUID, INTEGER, TEXT) CASCADE;

DROP TABLE IF EXISTS flyers CASCADE;
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS point_logs CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS price_entries CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS country_code CASCADE;
DROP TYPE IF EXISTS price_status CASCADE;

-- Now create everything fresh with correct UUID function
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create enum types
CREATE TYPE price_status AS ENUM ('active', 'pending_review', 'archived');
CREATE TYPE country_code AS ENUM ('ja', 'ko', 'tw', 'hk', 'sg');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  total_points INTEGER DEFAULT 0,
  title TEXT DEFAULT '駆け出しショッパー',
  city TEXT,
  country_code country_code DEFAULT 'ja',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_points CHECK (total_points >= 0)
);

-- Create stores table
CREATE TABLE stores (
  id TEXT PRIMARY KEY, -- Google Place ID
  name_ja TEXT NOT NULL,
  name_ko TEXT,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  google_place_id TEXT NOT NULL UNIQUE,
  geom GEOGRAPHY(POINT, 4326),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index
CREATE INDEX idx_stores_geom ON stores USING GIST (geom);

-- Create items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ja TEXT NOT NULL UNIQUE,
  name_ko TEXT,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  barcode TEXT UNIQUE,
  search_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create price_entries table
CREATE TABLE price_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES stores(id),
  item_id UUID NOT NULL REFERENCES items(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  price INTEGER NOT NULL, -- Store in cents (÷100 for display)
  image_url TEXT,
  status price_status DEFAULT 'active',
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_price CHECK (price >= 0)
);

-- Create likes table
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_entry_id UUID NOT NULL REFERENCES price_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(price_entry_id, user_id)
);

-- Create point_logs table for audit trail
CREATE TABLE point_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  price_entry_id UUID REFERENCES price_entries(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create user_badges table
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, badge_name)
);

-- Create flyers table
CREATE TABLE flyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES stores(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  image_url TEXT NOT NULL,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_price_entries_store_id ON price_entries(store_id);
CREATE INDEX idx_price_entries_item_id ON price_entries(item_id);
CREATE INDEX idx_price_entries_user_id ON price_entries(user_id);
CREATE INDEX idx_price_entries_status ON price_entries(status);
CREATE INDEX idx_price_entries_created_at ON price_entries(created_at);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_price_entry_id ON likes(price_entry_id);
CREATE INDEX idx_point_logs_user_id ON point_logs(user_id);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_flyers_store_id ON flyers(store_id);
CREATE INDEX idx_items_name_ja ON items(name_ja);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE flyers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for all tables
-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (true);

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Stores: Everyone can read, anyone authenticated can insert
CREATE POLICY stores_select ON stores
  FOR SELECT USING (true);

CREATE POLICY stores_insert ON stores
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Items: Everyone can read, admin/system only insert/update
CREATE POLICY items_select ON items
  FOR SELECT USING (true);

-- Price Entries: Everyone can read active entries
CREATE POLICY price_entries_select ON price_entries
  FOR SELECT USING (
    status = 'active'
    OR (status = 'pending_review' AND auth.uid() = user_id)
    OR (auth.uid() = user_id)
  );

-- Users can insert their own price entries
CREATE POLICY price_entries_insert ON price_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update status of their own entries
CREATE POLICY price_entries_update ON price_entries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'active');

-- Likes: Users can read all likes
CREATE POLICY likes_select ON likes
  FOR SELECT USING (true);

-- Users can insert likes (but cannot like their own entries - enforced in DB function)
CREATE POLICY likes_insert ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY likes_delete ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- Point Logs: Users can read only their own logs
CREATE POLICY point_logs_select ON point_logs
  FOR SELECT USING (auth.uid() = user_id);

-- User Badges: Everyone can read
CREATE POLICY user_badges_select ON user_badges
  FOR SELECT USING (true);

-- Flyers: Everyone can read, authenticated users can insert their own
CREATE POLICY flyers_select ON flyers
  FOR SELECT USING (true);

CREATE POLICY flyers_insert ON flyers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Database Functions
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

-- Seed categories
INSERT INTO items (name_ja, name_ko, category, unit)
VALUES
  -- Proteins
  ('卵', '계란', '食料品', '個'),
  ('豆腐', '두부', '食料品', 'パック'),
  ('納豆', '낫또', '食料品', 'パック'),
  ('牛乳', '우유', '食料品', '本'),
  ('ヨーグルト', '요거트', '食料品', 'パック'),

  -- Vegetables
  ('人参', '당근', '野菜', '本'),
  ('玉葱', '양파', '野菜', 'kg'),
  ('キャベツ', '양배추', '野菜', '個'),
  ('トマト', '토마토', '野菜', 'kg'),
  ('ブロッコリー', '브로콜리', '野菜', '個'),

  -- Fruits
  ('バナナ', '바나나', '果物', 'kg'),
  ('りんご', '사과', '果物', 'kg'),
  ('みかん', '귤', '果物', 'kg'),
  ('イチゴ', '딸기', '果物', 'パック'),

  -- Meat
  ('豚肉 (肩ロース)', '돼지고기 (어깨 로스트)', '食料品', 'kg'),
  ('鶏肉 (胸肉)', '닭고기 (가슴살)', '食料品', 'kg'),
  ('牛肉 (薄切り)', '소고기 (슬라이스)', '食料品', 'kg'),

  -- Fish & Seafood
  ('サバ', '고등어', '食料品', '尾'),
  ('鮭', '연어', '食料品', '尾'),
  ('イカ', '오징어', '食料品', '尾'),

  -- Rice & Grains
  ('米 (白米)', '쌀 (흰쌀)', '穀類', 'kg'),
  ('食パン', '식빵', '穀類', '本'),
  ('うどん', '우동', '穀類', '束'),

  -- Condiments & Sauces
  ('醤油', '간장', '調味料', 'L'),
  ('塩', '소금', '調味料', 'kg'),
  ('砂糖', '설탕', '調味料', 'kg'),
  ('油', '기름', '調味料', 'L'),
  ('味噌', '된장', '調味料', 'kg'),

  -- Snacks & Beverages
  ('ビール', '맥주', '飲料', '本'),
  ('コーヒー', '커피', '飲料', 'パック'),
  ('紅茶', '홍차', '飲料', 'box')
ON CONFLICT (name_ja) DO NOTHING;
