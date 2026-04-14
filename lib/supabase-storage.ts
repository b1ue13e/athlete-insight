/**
 * Supabase Storage Image Storage Service
 * 
 * Core principles:
 * - Images stored in Object Storage, not relational database
 * - Uses WebP format to reduce size
 * - Path structure: /users/{user_id}/{analysis_id}.webp
 * Now supports build-time without env vars
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Check config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const hasValidConfig = supabaseUrl && supabaseKey && 
                       supabaseUrl !== 'your_supabase_project_url' &&
                       supabaseKey !== 'your_supabase_anon_key'

// Lazy initialization
let _supabase: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_supabase) return _supabase
  
  if (!hasValidConfig) {
    console.warn('Supabase Storage: Missing config, using mock client')
    return createMockClient()
  }
  
  _supabase = createClient(supabaseUrl!, supabaseKey!)
  return _supabase
}

function createMockClient(): SupabaseClient {
  const mockError = new Error('Supabase Storage not configured')
  // @ts-ignore
  return {
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: mockError }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: () => Promise.resolve({ error: mockError }),
        list: () => Promise.resolve({ data: [], error: mockError }),
      }),
      listBuckets: () => Promise.resolve({ data: [], error: mockError }),
      createBucket: () => Promise.resolve({ data: null, error: mockError }),
    },
  } as SupabaseClient
}

// Export for backward compatibility
export const supabase = hasValidConfig ? getClient() : createMockClient()

// ============ Storage Bucket Config ============

const BUCKET_NAME = "player-photos"
const MAX_FILE_SIZE = 2 * 1024 * 1024  // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

// ============ Upload Image ============

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

/**
 * Upload player photo to Supabase Storage
 * 
 * @param userId - User ID
 * @param analysisId - Analysis record ID
 * @param file - Image file (Blob or File)
 * @returns Upload result with public URL
 */
export async function uploadPlayerPhoto(
  userId: string,
  analysisId: string,
  file: Blob | File
): Promise<UploadResult> {
  try {
    const client = getClient()
    
    // Validate file type
    if (file instanceof File && !ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `Unsupported file type: ${file.type}. Please upload JPG, PNG or WebP`
      }
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max 2MB allowed`
      }
    }

    // Generate file path
    const fileExt = file instanceof File ? file.name.split('.').pop() : 'webp'
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `users/${userId}/${analysisId}/${fileName}`

    // Upload file
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return {
        success: false,
        error: `Upload failed: ${error.message}`
      }
    }

    // Get public URL
    const { data: { publicUrl } } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrl,
      path: filePath
    }

  } catch (err) {
    console.error('Upload error:', err)
    return {
      success: false,
      error: 'Error during upload process'
    }
  }
}

/**
 * Upload image from data URL
 * 
 * @param userId - User ID
 * @param analysisId - Analysis record ID  
 * @param dataUrl - Base64 data URL
 * @returns Upload result
 */
export async function uploadPlayerPhotoFromDataUrl(
  userId: string,
  analysisId: string,
  dataUrl: string
): Promise<UploadResult> {
  try {
    // Parse data URL
    const match = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
    if (!match) {
      return {
        success: false,
        error: 'Invalid Data URL format'
      }
    }

    const mimeType = match[1]
    const base64Data = match[2]
    
    // Convert to Blob
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })

    return uploadPlayerPhoto(userId, analysisId, blob)

  } catch (err) {
    console.error('Data URL upload error:', err)
    return {
      success: false,
      error: 'Data URL processing failed'
    }
  }
}

// ============ Delete Image ============

/**
 * Delete player photo
 * 
 * @param filePath - File path
 */
export async function deletePlayerPhoto(filePath: string): Promise<boolean> {
  try {
    const client = getClient()
    const { error } = await client.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Delete error:', err)
    return false
  }
}

// ============ Get Image URL ============

/**
 * Get public URL for image
 * 
 * @param filePath - File path
 * @returns Public URL
 */
export function getPlayerPhotoUrl(filePath: string): string {
  const client = getClient()
  const { data: { publicUrl } } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)
  
  return publicUrl
}

// ============ List Query ============

/**
 * Get all photos for a user
 * 
 * @param userId - User ID
 * @returns Photo list
 */
export async function listUserPhotos(userId: string) {
  try {
    const client = getClient()
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .list(`users/${userId}`, {
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error('List error:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('List error:', err)
    return []
  }
}

// ============ Initialize Storage Bucket ============

/**
 * Check and create storage bucket (usually called once on server)
 */
export async function initializeStorageBucket() {
  try {
    const client = getClient()
    
    // Check if bucket exists
    const { data: buckets } = await client.storage.listBuckets()
    const exists = buckets?.some(b => b.name === BUCKET_NAME)

    if (!exists) {
      // Create bucket
      const { data, error } = await client.storage.createBucket(BUCKET_NAME, {
        public: true,  // Public access
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_TYPES
      })

      if (error) {
        console.error('Create bucket error:', error)
        return false
      }

      console.log('Storage bucket created:', data)
    }

    return true
  } catch (err) {
    console.error('Initialize error:', err)
    return false
  }
}
