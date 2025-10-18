export type Role = 'admin' | 'staff' | 'viewer'

export type Profile = {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role: Role
}
