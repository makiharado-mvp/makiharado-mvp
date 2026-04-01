export type Note = {
  id: string
  user_id: string
  title: string
  content: string
  image_url: string | null
  created_at: string
}

export type Post = {
  id: string
  user_id: string
  title: string
  content: string
  post_date: string       // YYYY-MM-DD
  image_url: string | null
  created_at: string
}

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
