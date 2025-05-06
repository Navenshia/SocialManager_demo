import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for interacting with Cloudinary
 */
export class CloudinaryService {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    // Use environment variables for these values or hardcoded values as fallback
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dof22i7vm';
    this.apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY || '245952711691622';
    this.apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET || 'DFrO4Cr3MU4SW9EQZqk2VzNrWrQ';

    console.log('Cloudinary initialized with cloud name:', this.cloudName);

    if (!this.cloudName) {
      console.warn('Cloudinary cloud name missing. Image uploads may not work correctly.');
    }
  }

  /**
   * Upload a file to Cloudinary
   * @param file The file to upload
   * @param folder Optional folder path within Cloudinary
   * @returns The public URL of the uploaded file
   */
  async uploadFile(file: File, folder: string = 'social_manager'): Promise<string> {
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);

      // Add authentication parameters
      formData.append('api_key', this.apiKey);

      // Add a timestamp
      const timestamp = Math.round(new Date().getTime() / 1000);
      formData.append('timestamp', timestamp.toString());

      // Add a unique public_id to prevent collisions
      const publicId = `${folder}/${uuidv4()}`;
      formData.append('public_id', publicId);

      // Generate a signature
      // In a production app, this should be done server-side
      // For demo purposes, we're doing it client-side
      const signatureParams = {
        public_id: publicId,
        timestamp: timestamp.toString(),
      };

      // Create signature string
      const signatureStr = Object.entries(signatureParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&') + this.apiSecret;

      // Generate SHA-1 hash for signature
      // Since we can't use crypto directly in the browser, we'll use a simple approach
      // This is NOT secure for production, but works for demo purposes
      const signature = await this.generateSignature(signatureStr);
      formData.append('signature', signature);

      console.log('Uploading to Cloudinary with direct upload...');

      // Upload to Cloudinary using the upload API
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`,
        formData
      );

      // Return the secure URL of the uploaded file
      const publicUrl = response.data.secure_url;
      console.log(`File uploaded successfully to Cloudinary: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file to Cloudinary:', error);
      throw new Error('Failed to upload file to Cloudinary');
    }
  }

  /**
   * Generate a signature for Cloudinary upload
   * In a production app, this should be done server-side
   * @param string The string to hash
   * @returns The SHA-1 hash
   */
  private async generateSignature(string: string): Promise<string> {
    // Use the Web Crypto API to generate a SHA-1 hash
    const msgUint8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Delete a file from Cloudinary
   * Note: This requires server-side implementation for security
   * @param url The public URL of the file to delete
   */
  async deleteFile(url: string): Promise<void> {
    try {
      // Extract the public ID from the URL
      const publicId = this.getPublicIdFromUrl(url);

      if (!publicId) {
        throw new Error('Could not extract public ID from URL');
      }

      // Note: In a production app, deletion should be handled server-side
      // as it requires the API secret which should not be exposed to the client
      console.log(`Would delete file with public ID: ${publicId}`);
      console.log('Note: Deletion requires server-side implementation for security');

      // For demo purposes, we'll just log the deletion request
      // In a real app, you would call a server endpoint to handle deletion
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      throw new Error('Failed to delete file from Cloudinary');
    }
  }

  /**
   * Extract the public ID from a Cloudinary URL
   * @param url The Cloudinary URL
   * @returns The public ID
   */
  private getPublicIdFromUrl(url: string): string | null {
    try {
      // Example URL: https://res.cloudinary.com/demo/image/upload/v1612345678/folder/filename.jpg
      const regex = new RegExp(`${this.cloudName}/(?:image|video|raw)/upload/(?:v\\d+/)?(.+)$`);
      const match = url.match(regex);

      if (match && match[1]) {
        // Remove file extension
        return match[1].replace(/\.[^/.]+$/, '');
      }

      return null;
    } catch (error) {
      console.error('Error extracting public ID from URL:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const cloudinaryStorage = new CloudinaryService();

export default cloudinaryStorage;
