/**
 * FileUploadService
 *
 * This service handles file uploads and provides URLs for media files.
 * This implementation uses Cloudinary for image and video hosting.
 * It falls back to data URLs if Cloudinary is not configured.
 */

import { cloudinaryStorage } from './cloudinaryStorage';

// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Check if Cloudinary is configured
const isCloudinaryConfigured = true; // We've hardcoded the cloud name in cloudinaryStorage.ts

export interface UploadResult {
  publicUrl: string;
  localPreviewUrl?: string; // Local preview URL for UI display
  fileType: 'image' | 'video';
  size: number;
  name: string;
}

export class FileUploadService {
  /**
   * Upload a file and get a URL
   * In production, this uploads to Cloudinary.
   * In development, it falls back to data URLs if Cloudinary upload fails.
   */
  static async uploadFile(file: File): Promise<UploadResult> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Validate file type
    let fileType: 'image' | 'video';

    if (file.type.startsWith('image/')) {
      fileType = 'image';
    } else if (file.type.startsWith('video/')) {
      fileType = 'video';
    } else {
      throw new Error('Unsupported file type. Please upload an image or video file.');
    }

    try {
      // Create a local preview URL for immediate display
      const localPreviewUrl = await createLocalPreview(file);

      // If Cloudinary is configured, upload to cloud storage
      if (isCloudinaryConfigured) {
        console.log('Uploading to Cloudinary...');

        // Determine the folder based on file type
        const folder = fileType === 'image' ? 'images' : 'videos';

        // Upload to Cloudinary
        const publicUrl = await cloudinaryStorage.uploadFile(file, folder);

        console.log(`File uploaded to Cloudinary: ${publicUrl}`);

        return {
          publicUrl,
          localPreviewUrl,
          fileType,
          size: file.size,
          name: file.name
        };
      } else {
        // Fallback to data URL for development/demo
        console.log('Cloudinary upload failed, using data URL instead');

        return {
          publicUrl: localPreviewUrl, // Use the data URL as the public URL
          localPreviewUrl,
          fileType,
          size: file.size,
          name: file.name
        };
      }
    } catch (error) {
      console.error('Error in file upload:', error);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   */
  static async deleteFile(url: string): Promise<void> {
    if (isCloudinaryConfigured && url.includes('cloudinary.com')) {
      await cloudinaryStorage.deleteFile(url);
    } else {
      console.log('Skipping delete for data URL or non-Cloudinary URL');
    }
  }
}

/**
 * Create a local preview URL for a file
 */
async function createLocalPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to create preview URL'));
      }
    };

    reader.onerror = () => {
      reject(reader.error || new Error('Unknown error reading file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validate if a file meets the requirements
 */
FileUploadService.validateFile = function(file: File): boolean {
  if (file.size > MAX_FILE_SIZE) {
    return false;
  }

  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    return false;
  }

  return true;
};

export default FileUploadService;