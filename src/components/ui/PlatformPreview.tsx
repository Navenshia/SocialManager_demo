import React from 'react';
import { Platform } from '../../types';
import { Instagram, Youtube } from 'lucide-react';

interface PlatformPreviewProps {
  platform: Platform;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  username?: string;
}

const PlatformPreview: React.FC<PlatformPreviewProps> = ({
  platform,
  content,
  mediaUrl,
  mediaType,
  username = 'yourusername'
}) => {
  // Common preview components
  const ImagePreview = ({ url }: { url?: string }) => (
    url ? (
      <img
        src={url}
        alt="Media preview"
        className="w-full h-auto rounded-lg object-cover"
      />
    ) : (
      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg aspect-square w-full flex items-center justify-center">
        <span className="text-gray-500 dark:text-gray-400">No image</span>
      </div>
    )
  );

  const VideoPreview = ({ url }: { url?: string }) => (
    url ? (
      <video
        src={url}
        className="w-full h-auto rounded-lg"
        controls
      />
    ) : (
      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg aspect-video w-full flex items-center justify-center">
        <span className="text-gray-500 dark:text-gray-400">No video</span>
      </div>
    )
  );

  // Instagram Preview
  if (platform === 'instagram') {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center">
            <Instagram size={16} className="text-white" />
          </div>
          <span className="ml-2 font-medium text-sm">{username}</span>
        </div>
        
        {/* Media */}
        <div className="aspect-square bg-black">
          {mediaType === 'image' ? (
            <ImagePreview url={mediaUrl} />
          ) : mediaType === 'video' ? (
            <VideoPreview url={mediaUrl} />
          ) : (
            <div className="bg-gray-200 dark:bg-gray-700 w-full h-full flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">No media</span>
            </div>
          )}
        </div>
        
        {/* Caption */}
        <div className="p-3">
          <p className="text-sm">
            <span className="font-semibold mr-1">{username}</span>
            {content || 'Your caption will appear here'}
          </p>
        </div>
      </div>
    );
  }
  
  // YouTube Preview
  if (platform === 'youtube') {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
        {/* Thumbnail/Video */}
        <div className="aspect-video bg-black relative">
          {mediaType === 'video' ? (
            <VideoPreview url={mediaUrl} />
          ) : mediaType === 'image' ? (
            <ImagePreview url={mediaUrl} />
          ) : (
            <div className="bg-gray-200 dark:bg-gray-700 w-full h-full flex items-center justify-center">
              <Youtube size={48} className="text-red-600" />
            </div>
          )}
        </div>
        
        {/* Title & details */}
        <div className="p-3">
          <h3 className="font-semibold mb-1 line-clamp-2">
            {content?.length > 0 ? content.split('\n')[0] : 'Your video title'}
          </h3>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>{username}</span>
            <span className="mx-1">•</span>
            <span>Just now</span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {content?.split('\n').slice(1).join('\n') || 'Your description will appear here'}
          </p>
        </div>
      </div>
    );
  }
  
  // TikTok Preview
  if (platform === 'tiktok') {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-black">
        {/* Video */}
        <div className="aspect-[9/16] relative">
          {mediaType === 'video' ? (
            <VideoPreview url={mediaUrl} />
          ) : (
            <div className="bg-gray-800 w-full h-full flex items-center justify-center">
              <div className="text-center">
                <span className="text-white font-bold text-2xl mb-2 block">TikTok</span>
                <span className="text-gray-300 text-sm">Video preview</span>
              </div>
            </div>
          )}
          
          {/* Caption overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
            <p className="text-sm mb-2">
              @{username} <span className="opacity-80">• Just now</span>
            </p>
            <p className="text-sm">
              {content || 'Your caption will appear here'} 
              <span className="text-xs opacity-80 block mt-1">#fyp #viral</span>
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export default PlatformPreview;