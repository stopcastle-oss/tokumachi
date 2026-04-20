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

-- Point logs are inserted only by backend (no direct user insert)

-- User Badges: Everyone can read
CREATE POLICY user_badges_select ON user_badges
  FOR SELECT USING (true);

-- Badges are inserted only by backend (no direct user insert)

-- Flyers: Everyone can read, authenticated users can insert their own
CREATE POLICY flyers_select ON flyers
  FOR SELECT USING (true);

CREATE POLICY flyers_insert ON flyers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
