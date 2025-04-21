import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Create a single supabase client for the entire application
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create a singleton instance for the server
let serverClient: ReturnType<typeof createClient<Database>> | null = null

export function createServerSupabaseClient() {
  if (serverClient) return serverClient

  // Use service role key for server operations if available
  const key = supabaseServiceRoleKey || supabaseAnonKey

  serverClient = createClient<Database>(supabaseUrl, key, {
    auth: {
      persistSession: false,
    },
  })

  return serverClient
}

// Create a client-side instance
export function createBrowserSupabaseClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: "supabase-auth",
    },
  })
}

// Helper function to ensure the storage bucket exists
export async function ensureStorageBucketExists() {
  const supabase = createServerSupabaseClient()

  try {
    console.log("Checking if storage bucket 'documents' exists...")

    // Check if the bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error("Error listing buckets:", listError)
      return false
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === "documents")
    console.log("Bucket exists:", bucketExists)

    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      console.log("Creating 'documents' bucket...")
      try {
        const { error: createError } = await supabase.storage.createBucket("documents", {
          public: true, // Make the bucket public by default
          fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
        })

        if (createError) {
          console.error("Error creating storage bucket:", createError)
          return false
        }
        console.log("Bucket created successfully")
      } catch (createError) {
        console.error("Exception creating bucket:", createError)
        return false
      }
    } else {
      // Update the bucket to ensure it's public
      console.log("Updating bucket to ensure it's public...")
      try {
        const { error: updateError } = await supabase.storage.updateBucket("documents", {
          public: true,
        })

        if (updateError) {
          console.error("Error updating bucket visibility:", updateError)
        } else {
          console.log("Bucket updated successfully")
        }
      } catch (updateError) {
        console.error("Exception updating bucket:", updateError)
        // Continue even if update fails
      }
    }

    // Verify the bucket exists after creation attempt
    const { data: verifyBuckets, error: verifyError } = await supabase.storage.listBuckets()

    if (verifyError) {
      console.error("Error verifying buckets:", verifyError)
      return false
    }

    const bucketVerified = verifyBuckets?.some((bucket) => bucket.name === "documents")
    console.log("Bucket verified:", bucketVerified)

    return bucketVerified
  } catch (error) {
    console.error("Error checking/creating storage bucket:", error)
    return false
  }
}
