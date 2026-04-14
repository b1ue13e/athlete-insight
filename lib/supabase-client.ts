/**
 * Supabase Client Configuration
 * 
 * Unified Supabase client config, supports auth and database operations
 * Now supports build-time without env vars (graceful degradation)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if we have valid config
const hasValidConfig = supabaseUrl && supabaseAnonKey && 
                       supabaseUrl !== 'your_supabase_project_url' &&
                       supabaseAnonKey !== 'your_supabase_anon_key'

// Lazy initialization - only create client when needed
let _supabase: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase
  
  if (!hasValidConfig) {
    // During build time or when env vars are missing, return a mock client
    // that throws descriptive errors when actually used
    console.warn('Supabase: Missing environment variables, using mock client')
    return createMockClient()
  }
  
  _supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  
  return _supabase
}

// Create a mock client that throws helpful errors
function createMockClient(): SupabaseClient {
  const mockError = new Error(
    'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  )
  
  // @ts-ignore - creating minimal mock
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: mockError }),
      getUser: () => Promise.resolve({ data: { user: null }, error: mockError }),
      signUp: () => Promise.resolve({ data: { user: null }, error: mockError }),
      signInWithPassword: () => Promise.resolve({ data: { user: null }, error: mockError }),
      signOut: () => Promise.resolve({ error: mockError }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: mockError }) }) }),
      insert: () => Promise.resolve({ data: null, error: mockError }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: mockError }) }),
    }),
  } as SupabaseClient
}

// Export singleton for backward compatibility
export const supabase = hasValidConfig ? getSupabaseClient() : createMockClient()

// User type definition
export interface User {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
}

// Auth response
export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
}

// ============ Auth API ============

/**
 * Get current session
 */
export async function getCurrentSession() {
  const client = getSupabaseClient()
  const { data: { session }, error } = await client.auth.getSession()
  
  if (error || !session) {
    return null
  }
  
  return session
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient()
  const { data: { user }, error } = await client.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  // Get user profile
  const { data: profile } = await client
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single()
  
  return {
    id: user.id,
    email: user.email!,
    displayName: profile?.display_name,
    avatarUrl: profile?.avatar_url,
  }
}

/**
 * Email/password registration
 */
export async function signUpWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client.auth.signUp({
      email,
      password,
    })
    
    if (error) throw error
    
    if (data.user) {
      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email!,
        },
      }
    }
    
    return { success: false, error: "Registration failed" }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Email/password login
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    
    if (data.user) {
      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email!,
        },
      }
    }
    
    return { success: false, error: "Login failed" }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient()
    const { error } = await client.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  const client = getSupabaseClient()
  const { data: { subscription } } = client.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        const user = await getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    }
  )
  
  return subscription
}
