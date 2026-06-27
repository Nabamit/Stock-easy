import { createBrowserClient } from "./client";

/**
 * Uploads a file (document, logo, photo) to Supabase Storage client-side.
 * Returns the public URL of the uploaded asset.
 * 
 * @param key The document identifier (e.g., 'drugLicense', 'pan', 'gst', 'shopPhoto')
 * @param file The File object selected by the user
 */
export async function uploadDocument(key: string, file: File): Promise<string> {
  const supabase = createBrowserClient();

  // Generate a unique path to avoid collisions
  const fileExt = file.name.split(".").pop() || "bin";
  const uniqueId = Math.random().toString(36).substring(2, 15);
  const fileName = `${key}-${Date.now()}-${uniqueId}.${fileExt}`;
  const filePath = `registration/${fileName}`;

  // Upload to bucket 'pharmacy-documents'
  const { data, error } = await supabase.storage
    .from("pharmacy-documents")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error(`Supabase Storage upload error for ${key}:`, error);
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("pharmacy-documents")
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error("Failed to generate public URL for uploaded document.");
  }

  return urlData.publicUrl;
}
