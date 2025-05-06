import axios from 'axios';

/**
 * Service for interacting with Cloudinary
 */
export class CloudinaryService {
  private cloudName: string;
  private uploadPreset: string;
  private apiKey: string;

  constructor() {
    // Use environment variables for these values
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dof22i7vm';
    this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'social_manager_preset';
    this.apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY || '245952711691622';

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

      // If we have an upload preset, use it (for unsigned uploads)
      if (this.uploadPreset) {
        formData.append('upload_preset', this.uploadPreset);
      }

      formData.append('folder', folder);

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
