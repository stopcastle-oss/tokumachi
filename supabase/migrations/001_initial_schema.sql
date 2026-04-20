-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create enum types
CREATE TYPE price_status AS ENUM ('active', 'pending_review', 'archived');
CREATE TYPE country_code AS ENUM ('ja', 'ko', 'tw', 'hk', 'sg');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id TEXT NOT NULL REFERENCES stores(id),
  item_id UUID NOT NULL REFERENCES items(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  price INTEGER NOT NULL, -- Store in cents (÷100 for display)
  image_url TEXT,
  status price_status DEFAULT 'active',
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_daily_entry UNIQUE (store_id, item_id, user_id, DATE(created_at AT TIME ZONE 'Asia/Tokyo')),
  CONSTRAINT valid_price CHECK (price >= 0)
);

-- Create likes table
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_entry_id UUID NOT NULL REFERENCES price_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(price_entry_id, user_id)
);

-- Create point_logs table for audit trail
CREATE TABLE point_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  price_entry_id UUID REFERENCES price_entries(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create user_badges table
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, badge_name)
);

-- Create flyers table
CREATE TABLE flyers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Enable Row Level Security (will be configured in 002_rls_policies.sql)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE flyers ENABLE ROW LEVEL SECURITY;
