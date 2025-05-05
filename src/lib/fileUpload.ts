/**
 * FileUploadService
 * 
 * This service handles file uploads and provides public URLs for media files.
 * In a production environment, this would upload to cloud storage like S3, Firebase, etc.
 * For this implementation, we'll simulate file uploads by creating data URLs.
 */

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface UploadResult {
  publicUrl: string;
  fileType: 'image' | 'video';
  size: number;
  name: string;
}

export class FileUploadService {
  /**
   * Upload a file and get a public URL
   * Note: In a real implementation, this would upload to a cloud storage service
   * and return the URL of the uploaded file.
   * 
   * For this demo, we'll convert the file to a data URL instead.
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
    
    // In a real implementation, upload to cloud storage and get URL
    // For this example, we'll create a data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve({
            publicUrl: reader.result,
            fileType,
            size: file.size,
            name: file.name
          });
        } else {
          reject(new Error('Failed to convert file to data URL'));
        }
      };
      
      reader.onerror = () => {
        reject(reader.error || new Error('Unknown error occurred during file read'));
      };
      
      // Convert file to data URL
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Validate if a file meets the requirements
   */
  static validateFile(file: File): boolean {
    if (file.size > MAX_FILE_SIZE) {
      return false;
    }
    
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return false;
    }
    
    return true;
  }
}

export default FileUploadService; 