import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image, Film } from 'lucide-react';
import Button from './Button';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  accept: {
    [key: string]: string[];
  };
  maxSize?: number;
  label?: string;
  initialPreview?: string;
  mediaType?: 'image' | 'video';
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileChange,
  accept,
  maxSize = 50 * 1024 * 1024, // 50MB default
  label = 'Drop your file here, or click to browse',
  initialPreview,
  mediaType,
}) => {
  const [preview, setPreview] = useState<string | null>(initialPreview || null);
  const [error, setError] = useState<string | null>(null);
  
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles[0].errors.map((err: any) => err.message).join(', ');
      setError(`File rejected: ${errors}`);
      return;
    }

    if (acceptedFiles.length) {
      const file = acceptedFiles[0];
      onFileChange(file);
      
      // Generate preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  }, [onFileChange]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false
  });
  
  const removeFile = () => {
    setPreview(null);
    onFileChange(null);
  };
  
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      
      {!preview ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-2xl p-8
            transition-colors flex flex-col items-center justify-center
            cursor-pointer
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
          `}
          style={{ minHeight: '200px' }}
        >
          <input {...getInputProps()} />
          
          <Upload 
            className={`mb-4 ${
              isDragActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
            }`} 
            size={36} 
          />
          
          <p className="text-center text-gray-600 dark:text-gray-400 mb-2">
            {isDragActive ? 'Drop the file here' : 'Drag & drop your file here, or click to browse'}
          </p>
          
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
            {mediaType === 'image' ? 'Images: JPG, PNG, GIF up to 50MB' : 
              mediaType === 'video' ? 'Videos: MP4, MOV up to 50MB' :
              'Files up to 50MB'}
          </p>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-700">
          {/* Preview image or video */}
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
            {preview.startsWith('data:image/') ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-full object-contain"
              />
            ) : preview.startsWith('data:video/') ? (
              <video 
                src={preview} 
                controls 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {mediaType === 'image' ? (
                  <Image size={48} className="text-gray-400" />
                ) : (
                  <Film size={48} className="text-gray-400" />
                )}
              </div>
            )}
          </div>
          
          {/* Remove button */}
          <Button
            variant="danger"
            size="sm"
            icon={<X size={16} />}
            onClick={removeFile}
            className="absolute top-2 right-2"
          >
            Remove
          </Button>
        </div>
      )}
      
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUpload;