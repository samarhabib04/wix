export interface BlogPost {
  id: string;
  title: string;
  description: string;
  content: string;
  author: string;
  author_image: string | null;
  category: string[] | string; // Updated to support both string and string[] for backward compatibility
  date?: string; // Add this for backward compatibility
  featured: boolean;
  status: string;
  publish_date: string | null;
  created_at: string;
  updated_at: string;
  read_time: string | null;
  image: string | null;
  slug: string;
}

export interface ShowcaseListing {
  id: string;
  title: string;
  breed: string;
  breed_type?: string; // Added for crossbreed support
  breed_1?: string; // Added for crossbreed support
  breed_2?: string; // Added for crossbreed support
  location: string;
  images: string[]; // This can come from Supabase as Json or string[]
  primary_image_index: number;
  admin_approved: boolean;
  date_of_birth: string;

  is_published: boolean;
  sex?: string;
  size?: string;
  energy?: string;
  family_tree?: any;
  created_at: string;
  updated_at: string;
  seller_id: string;
  status: string;
  video_url?: string | null;
  admin_notes?: string | null;
  pending_edit_id?: string | null;
  boostType?: 'standard' | 'premium' | 'elite' | 'gold' | null;
}




























