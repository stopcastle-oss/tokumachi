// Database types for TokuMachi

export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  total_points: number;
  title: string;
  city: string | null;
  country_code: string;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string; // Google Place ID
  name_ja: string;
  name_ko: string | null;
  address: string;
  latitude: number;
  longitude: number;
  google_place_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  name_ja: string;
  name_ko: string | null;
  category: string;
  unit: string;
  barcode: string | null;
  search_count: number;
  created_at: string;
  updated_at: string;
}

export interface PriceEntry {
  id: string;
  store_id: string;
  item_id: string;
  user_id: string;
  price: number;
  image_url: string | null;
  status: "active" | "pending_review" | "archived";
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: string;
  price_entry_id: string;
  user_id: string;
  created_at: string;
}

export interface PointLog {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  price_entry_id: string | null;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_name: string;
  earned_at: string;
}

export interface Flyer {
  id: string;
  store_id: string;
  user_id: string;
  image_url: string;
  valid_from: string;
  valid_to: string;
  created_at: string;
}

// API Response types

export interface DashboardResponse {
  today_entries_count: number;
  trending_items: Array<{
    item_id: string;
    name_ja: string;
    count: number;
  }>;
  top_liked_entries: PriceEntry[];
  popular_searches: Array<{
    item_id: string;
    name_ja: string;
    search_count: number;
  }>;
}

export interface StoreWithDistance extends Store {
  distance_meters: number;
  entry_count: number;
}

export interface NearbyStoresResponse {
  stores: StoreWithDistance[];
}

export interface PriceSearchResponse {
  results: Array<
    PriceEntry & {
      store: Store;
      item: Item;
      like_count: number;
    }
  >;
}

export interface ItemSearchResponse {
  results: Array<{
    item_id: string;
    name_ja: string;
    name_ko: string | null;
    category: string;
  }>;
}
