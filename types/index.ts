export type Note = {
  id: string
  user_id: string
  title: string
  content: string
  image_url: string | null
  created_at: string
}

export type PostImage = {
  id: string
  post_id: string
  user_id: string
  storage_path: string
  image_url: string
  position: number
  created_at: string
}

export type Post = {
  id: string
  user_id: string
  title: string
  content: string
  post_date: string       // YYYY-MM-DD
  image_url: string | null  // legacy; new posts leave this null
  created_at: string
  post_images?: PostImage[]
}

export type LibraryImage = {
  id: string
  library_post_id: string
  user_id: string
  storage_path: string
  image_url: string
  position: number
  created_at: string
}

export type LibraryPost = {
  id: string
  user_id: string
  // source_note_id intentionally omitted from this type — never exposed in public queries
  title: string
  content: string
  category: string
  tags: string[]
  created_at: string
  updated_at: string
  library_images?: LibraryImage[]
}

export const LIBRARY_CATEGORIES = ['stationery', 'journaling', 'tips', 'reviews', 'other'] as const
export type LibraryCategory = typeof LIBRARY_CATEGORIES[number]

export type Review = {
  id: string
  note_id: string | null
  post_id: string | null
  user_id: string
  interval_day: number
  due_date: string        // YYYY-MM-DD
  completed_at: string | null
  created_at: string
  notes?: Note
  posts?: Post
}
