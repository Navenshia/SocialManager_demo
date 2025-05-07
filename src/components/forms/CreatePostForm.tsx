import React, { useState, useEffect } from 'react';
import { Calendar, Calendar as CalendarIcon, Clock, AlertTriangle, Instagram, Youtube, TrendingUp, Facebook } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Toggle from '../ui/Toggle';
import FileUpload from '../ui/FileUpload';
import Card from '../ui/Card';
import PlatformPreview from '../ui/PlatformPreview';
import { Platform } from '../../types';
import usePostsStore from '../../store/usePostsStore';
import useSettingsStore from '../../store/useSettingsStore';
import { format } from 'date-fns';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { socialMediaCoordinator, apiFactory } from '../../api';
import InstagramApiService from '../../api/InstagramApiService';
import FacebookApiService from '../../api/FacebookApiService';
import FileUploadService from '../../lib/fileUpload';

interface CreatePostFormProps {
  onSuccess?: () => void;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({ onSuccess }) => {
  // Form state
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = useState<'image' | 'video' | undefined>(undefined);
  const [publicMediaUrl, setPublicMediaUrl] = useState<string>('');
  const [usePublicUrl, setUsePublicUrl] = useState<boolean>(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'youtube', 'tiktok', 'facebook']);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | null>(null);

  // Form processing states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<Platform>('instagram');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get platform credentials from settings
  const { apiCredentials, platformsEnabled } = useSettingsStore();

  // Track user data
  const [username, setUsername] = useState<string | null>(null);
  const [facebookPageName, setFacebookPageName] = useState<string | null>(null);
  const [isLoadingUsername, setIsLoadingUsername] = useState(false);
  const [isLoadingFacebookPage, setIsLoadingFacebookPage] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [facebookPageError, setFacebookPageError] = useState<string | null>(null);

  // Access post store actions
  const createPost = usePostsStore(state => state.createPost);
  const schedulePost = usePostsStore(state => state.schedulePost);
  const publishPost = usePostsStore(state => state.publishPost);
  const markAsFailed = usePostsStore(state => state.markAsFailed);

  // Fetch usernames on component mount
  useEffect(() => {
    const fetchInstagramUsername = async () => {
      if (apiCredentials.instagram && platformsEnabled.instagram) {
        try {
          setIsLoadingUsername(true);
          setUsernameError(null);

          // Use API service to get basic account info
          const instagramApi = apiFactory.getApiService('instagram') as InstagramApiService;

          // Fetch basic profile info directly
          const profileInfo = await instagramApi.getBasicProfileInfo();

          if (profileInfo && profileInfo.username) {
            setUsername(profileInfo.username);
            console.log("Username fetched directly:", profileInfo.username);
          } else {
            // If fetching failed or username is missing, use default
            setUsername("Instagram User");
            setUsernameError('Could not retrieve your Instagram username. Using default.');
            console.warn("Failed to fetch username directly or username missing in response.");
          }
        } catch (error) {
          console.error('Error fetching Instagram username:', error);
          setUsernameError('Could not retrieve your Instagram username. Please check your access token.');
          setUsername("Instagram User"); // Fallback on error
        } finally {
          setIsLoadingUsername(false);
        }
      } else {
        setUsername(null);
        setUsernameError('Instagram is not connected. Please connect your account in Settings.');
      }
    };

    const fetchFacebookPageName = async () => {
      if (apiCredentials.facebook && platformsEnabled.facebook) {
        try {
          setIsLoadingFacebookPage(true);
          setFacebookPageError(null);

          // Use API service to get basic account info
          const facebookApi = apiFactory.getApiService('facebook') as FacebookApiService;

          // Fetch basic profile info directly
          const profileInfo = await facebookApi.getBasicProfileInfo();

          if (profileInfo && profileInfo.name) {
            setFacebookPageName(profileInfo.name);
            console.log("Facebook page name fetched:", profileInfo.name);
          } else {
            // If fetching failed or name is missing, use default
            setFacebookPageName("Facebook Page");
            setFacebookPageError('Could not retrieve your Facebook page name. Using default.');
            console.warn("Failed to fetch Facebook page name or name missing in response.");
          }
        } catch (error) {
          console.error('Error fetching Facebook page name:', error);
          setFacebookPageError('Could not retrieve your Facebook page name. Please check your access token.');
          setFacebookPageName("Facebook Page"); // Fallback on error
        } finally {
          setIsLoadingFacebookPage(false);
        }
      } else {
        setFacebookPageName(null);
        setFacebookPageError('Facebook is not connected. Please connect your account in Settings.');
      }
    };

    fetchInstagramUsername();
    fetchFacebookPageName();
  }, [apiCredentials.instagram, platformsEnabled.instagram, apiCredentials.facebook, platformsEnabled.facebook]);

  // Handle media file change
  const handleFileChange = async (file: File | null) => {
    if (file) {
      setMediaFile(file);

      // Determine media type
      if (file.type.startsWith('image/')) {
        setMediaType('image');
      } else if (file.type.startsWith('video/')) {
        setMediaType('video');
      }

      // Create preview URL for the UI
      const objectUrl = URL.createObjectURL(file);
      setMediaUrl(objectUrl);

      console.log(`File selected: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      console.log(`Created local preview URL for UI: ${objectUrl}`);
    } else {
      setMediaFile(null);
      setMediaUrl(undefined);
      setMediaType(undefined);
      console.log('File selection cleared');
    }
  };

  // Toggle platform selection
  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        // Remove platform if already selected
        return prev.filter(p => p !== platform);
      } else {
        // Add platform if not already selected
        return [...prev, platform];
      }
    });
  };

  // Verify platform availability
  const verifyPlatforms = () => {
    const enabledAndSelected = selectedPlatforms.filter(platform =>
      platformsEnabled[platform] && apiCredentials[platform]
    );

    if (enabledAndSelected.length === 0) {
      setError('None of the selected platforms are properly connected. Please check your Settings.');
      return false;
    }

    if (enabledAndSelected.length < selectedPlatforms.length) {
      // Some platforms are selected but not available
      setSelectedPlatforms(enabledAndSelected);
      setError('Some selected platforms are not properly connected and have been deselected.');
      return true;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation checks
    if (content.trim() === '') {
      setError('Please enter some content for your post');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform');
      return;
    }

    if (isScheduled && !scheduleDate) {
      setError('Please select a date and time to schedule your post');
      return;
    }

    // For Instagram posts, media is required
    if (selectedPlatforms.includes('instagram') && !mediaFile && !(usePublicUrl && publicMediaUrl)) {
      setError('Instagram posts require an image or video. Please upload media or provide a public URL.');
      return;
    }

    // Verify platforms are properly connected
    if (!verifyPlatforms()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let finalMediaUrl: string | undefined;

      // If using a public URL directly
      if (usePublicUrl && publicMediaUrl) {
        console.log("Using provided public URL:", publicMediaUrl);
        finalMediaUrl = publicMediaUrl;

        // Validate the URL
        try {
          new URL(finalMediaUrl);
        } catch (e) {
          setError("Please enter a valid URL");
          setIsSubmitting(false);
          return;
        }

        // Make sure we have a media type
        if (!mediaType) {
          // Try to determine media type from URL
          const url = finalMediaUrl.toLowerCase();

          // Check for common image extensions, handling query parameters
          const isImage = url.includes('.jpg') || url.includes('.jpeg') ||
                         url.includes('.png') || url.includes('.gif') ||
                         url.includes('pexels-photo') || url.includes('unsplash');

          // Check for common video extensions, handling query parameters
          const isVideo = url.includes('.mp4') || url.includes('.mov') ||
                         url.includes('.avi') || url.includes('.webm');

          if (isImage) {
            setMediaType('image');
            console.log("Detected as image URL");
          } else if (isVideo) {
            setMediaType('video');
            console.log("Detected as video URL");
          } else {
            // Default to image if we can't determine
            setMediaType('image');
            console.log("Could not determine media type, defaulting to image");
          }
        }

        console.log("Using public URL with media type:", mediaType);
      }
      // If we have a media file, upload it to get a public URL
      else if (mediaFile) {
        try {
          setIsUploading(true);
          setUploadProgress(10);

          // Upload file to get a public URL
          // For Instagram API, we need a publicly accessible URL
          console.log("Reading file and preparing media...");
          setUploadProgress(30);

          console.log("Processing media and preparing for Instagram...");
          setUploadProgress(50);

          const uploadResult = await FileUploadService.uploadFile(mediaFile);
          finalMediaUrl = uploadResult.publicUrl;

          // If we have a local preview URL, use it for the UI
          if (uploadResult.localPreviewUrl) {
            // Update the UI preview with the local URL
            setMediaUrl(uploadResult.localPreviewUrl);
          }

          console.log("Upload complete, processing...");
          setUploadProgress(90);

          // Short delay to show the complete progress
          await new Promise(resolve => setTimeout(resolve, 500));

          setUploadProgress(100);
          console.log("Media processed successfully");
          console.log("Public URL for API calls:", finalMediaUrl);
          console.log("Media type:", uploadResult.fileType);

          // Update media type from the upload result
          setMediaType(uploadResult.fileType);
        } catch (uploadError) {
          console.error("Error processing media:", uploadError);
          setError(uploadError instanceof Error ? uploadError.message : 'Error processing media file');
          setIsSubmitting(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      // Create the post in the local store with the public URL
      const newPost = createPost(
        content,
        finalMediaUrl,  // Use the final media URL (either from file upload or direct input)
        mediaType,
        selectedPlatforms
      );

      // Add the original file to the post for platforms that can use it directly
      if (mediaFile) {
        newPost.mediaFile = mediaFile;
        console.log("Added original file to post for direct upload:", mediaFile.name);
      }

      // If scheduled, update with schedule time
      if (isScheduled && scheduleDate) {
        schedulePost(newPost.id, scheduleDate);

        // In a real app, we'd have a background job/service to publish at the scheduled time
        console.log(`Post scheduled for ${scheduleDate.toISOString()}`);

        setIsSubmitting(false);
        resetForm();
        onSuccess?.();
        return;
      }

      // If not scheduled (publish now), send to platforms
      console.log("Publishing post to platforms:", selectedPlatforms);
      console.log("Post data:", { content, mediaUrl: finalMediaUrl, mediaType });

      try {
        console.log("Publishing post to selected platforms:", selectedPlatforms);
        console.log("Post content:", content);
        console.log("Media URL for API:", finalMediaUrl);
        console.log("Media type:", mediaType);
        console.log("Using direct public URL:", usePublicUrl);

        // Attempt to publish to all selected platforms
        const platformResults = await socialMediaCoordinator.publishToMultiplePlatforms(newPost);

        // Check which platforms succeeded and which failed
        const successfulPlatforms = Object.entries(platformResults)
          .filter(([_, id]) => id !== null)
          .map(([platform]) => platform);

        const failedPlatforms = Object.entries(platformResults)
          .filter(([_, id]) => id === null)
          .map(([platform]) => platform);

        console.log("Successfully published to:", successfulPlatforms);
        console.log("Failed to publish to:", failedPlatforms);

        // Check if any platforms succeeded
        const anySuccess = successfulPlatforms.length > 0;

        if (anySuccess) {
          // Update the post with the platform-specific IDs
          publishPost(newPost.id, platformResults as Record<Platform, string>);
          console.log("Post published successfully to some platforms:", platformResults);

          if (failedPlatforms.length > 0) {
            // Some platforms failed
            setError(`Post published to ${successfulPlatforms.join(', ')} but failed on ${failedPlatforms.join(', ')}. Check settings for failed platforms.`);
          }
        } else {
          // If all failed, mark the post as failed
          markAsFailed(newPost.id, 'Failed to publish to all platforms');
          console.error("Failed to publish to any platform:", platformResults);
          setError("Failed to publish to any selected platform. Check your media format and connection.");
        }
      } catch (publishError) {
        console.error("Error during post publishing:", publishError);
        markAsFailed(newPost.id, publishError instanceof Error ? publishError.message : 'Unknown error during publishing');
        setError(publishError instanceof Error ? publishError.message : 'Error occurred while publishing');
        setIsSubmitting(false);
        return;
      }

      // Show success message if there were no errors
      if (!error) {
        // Create a success message based on selected platforms
        const platformNames = selectedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');

        // Add a success message
        if (usePublicUrl) {
          alert(`Post published successfully to ${platformNames} with your caption and the provided public image URL! Check your accounts to see the post.`);
        } else if (mediaFile && mediaType === 'image') {
          alert(`Post published successfully to ${platformNames} with your caption and your uploaded image! Check your accounts to see the post.`);
        } else if (mediaFile && mediaType === 'video') {
          alert(`Post published successfully to ${platformNames} with your caption and your uploaded video! Check your accounts to see the post.`);
        } else {
          alert(`Post published successfully to ${platformNames}! Check your accounts to see the post.`);
        }

        // Add a specific note about Facebook if it was selected
        if (selectedPlatforms.includes('facebook') && mediaFile) {
          alert("Your image has been directly uploaded to Facebook using our new direct upload feature. This should work much better than previous methods.");
        }
      }

      setIsSubmitting(false);
      resetForm();
      onSuccess?.();

    } catch (err) {
      console.error('Error submitting post:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsSubmitting(false);
    }
  };

  // Reset form after submission
  const resetForm = () => {
    setContent('');
    setMediaFile(null);
    setMediaUrl(undefined);
    setMediaType(undefined);
    setSelectedPlatforms(['instagram', 'youtube', 'tiktok', 'facebook']);
    setIsScheduled(false);
    setScheduleDate(null);
    setError(null);
    setUploadProgress(0);
  };

  // Check if platforms are properly connected
  const isInstagramConnected = apiCredentials.instagram && platformsEnabled.instagram;
  const isFacebookConnected = apiCredentials.facebook && platformsEnabled.facebook;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Platform Connection Status */}
      {selectedPlatforms.includes('instagram') && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-2">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center mr-3">
              <Instagram size={16} className="text-white" />
            </div>
            <div className="flex-1">
              {isInstagramConnected ? (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {isLoadingUsername ? 'Loading...' : username || 'Instagram User'}
                  </span>
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Instagram</span>
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Not Connected
                  </span>
                </div>
              )}
              {usernameError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{usernameError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPlatforms.includes('facebook') && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-3">
              <Facebook size={16} className="text-white" />
            </div>
            <div className="flex-1">
              {isFacebookConnected ? (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {isLoadingFacebookPage ? 'Loading...' : facebookPageName || 'Facebook Page'}
                  </span>
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Facebook</span>
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Not Connected
                  </span>
                </div>
              )}
              {facebookPageError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{facebookPageError}</p>
              )}

              {/* Facebook image posting info */}
              {mediaFile && selectedPlatforms.includes('facebook') && (
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                  <p className="font-medium">About Facebook image posting:</p>
                  <p>We now use direct file uploads for Facebook, which should work much better than URL-based posting.</p>
                  <p className="mt-1">How it works:</p>
                  <ol className="list-decimal pl-4 mt-1">
                    <li>Your image file is sent directly to Facebook's API</li>
                    <li>This bypasses the need for publicly accessible URLs</li>
                    <li>Your original image quality is preserved</li>
                  </ol>
                  <p className="mt-1">If you still encounter issues:</p>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Try using a different image format (JPG works best)</li>
                    <li>Make sure your image is less than 4MB in size</li>
                    <li>Check the browser console for detailed error messages</li>
                  </ul>
                </div>
              )}

              {usePublicUrl && publicMediaUrl && selectedPlatforms.includes('facebook') && (
                <div className="mt-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  <p className="font-medium">Using public URL for Facebook:</p>
                  <p>Using a public URL is the recommended way to post images to Facebook.</p>
                  <p className="mt-1">Recommended image URL formats:</p>
                  <ul className="list-disc pl-4 mt-1">
                    <li>https://i.imgur.com/example.jpg</li>
                    <li>https://example.com/images/photo.png</li>
                    <li>https://live.staticflickr.com/example.jpg</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Post Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="block w-full rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   p-4 placeholder:text-gray-400"
          placeholder="Write your caption or post content here..."
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {content.length} characters
        </p>
      </div>

      {/* Media Options */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Use Public URL</h3>
          <Toggle
            checked={usePublicUrl}
            onChange={setUsePublicUrl}
          />
        </div>

        {usePublicUrl ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Public Image/Video URL
            </label>
            <Input
              type="url"
              value={publicMediaUrl}
              onChange={(e) => {
                setPublicMediaUrl(e.target.value);

                // Try to determine media type from URL
                const url = e.target.value.toLowerCase();

                // Check for common image extensions, handling query parameters
                const isImage = url.includes('.jpg') || url.includes('.jpeg') ||
                               url.includes('.png') || url.includes('.gif') ||
                               url.includes('pexels-photo') || url.includes('unsplash');

                // Check for common video extensions, handling query parameters
                const isVideo = url.includes('.mp4') || url.includes('.mov') ||
                               url.includes('.avi') || url.includes('.webm');

                if (isImage) {
                  setMediaType('image');
                  console.log("Detected as image URL");
                } else if (isVideo) {
                  setMediaType('video');
                  console.log("Detected as video URL");
                } else {
                  // Default to image for URLs we can't categorize
                  setMediaType('image');
                  console.log("Could not determine media type, defaulting to image");
                }

                // Set the URL as the preview URL
                if (e.target.value) {
                  setMediaUrl(e.target.value);
                } else {
                  setMediaUrl(undefined);
                }
              }}
              placeholder="https://example.com/your-image.jpg"
              className="w-full"
            />
            <p className="text-sm text-green-600 dark:text-green-400">
              Enter a publicly accessible URL for your image or video.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Example: https://example.com/your-image.jpg
            </p>

            {publicMediaUrl && (
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                Detected media type: {mediaType || 'unknown'}
              </p>
            )}

            {/* Preview for public URL */}
            {mediaUrl && (mediaType === 'image' || !mediaType) && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview:</p>
                <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <img
                    src={mediaUrl}
                    alt="Preview"
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      console.error("Image failed to load:", e);
                      setError("Could not load image from URL. Make sure it's a valid, publicly accessible image URL.");
                      // Don't clear the URL, just show the error
                    }}
                    onLoad={() => {
                      // Clear any errors when image loads successfully
                      if (error && error.includes("Could not load image")) {
                        setError(null);
                      }
                      console.log("Image loaded successfully");
                      // Ensure media type is set to image
                      setMediaType('image');
                    }}
                  />
                </div>
              </div>
            )}

            {mediaUrl && mediaType === 'video' && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview:</p>
                <div className="relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <video
                    src={mediaUrl}
                    controls
                    className="w-full h-full"
                    onError={(e) => {
                      console.error("Video failed to load:", e);
                      setError("Could not load video from URL. Make sure it's a valid, publicly accessible video URL.");
                      // Don't clear the URL, just show the error
                    }}
                    onLoadedData={() => {
                      // Clear any errors when video loads successfully
                      if (error && error.includes("Could not load video")) {
                        setError(null);
                      }
                      console.log("Video loaded successfully");
                      // Ensure media type is set to video
                      setMediaType('video');
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <FileUpload
              onFileChange={handleFileChange}
              accept={{
                'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
                'video/*': ['.mp4', '.mov', '.avi']
              }}
              label="Media Upload"
              mediaType={mediaType}
            />

            {mediaFile && (
              <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                <p className="font-medium">Media Processing:</p>
                <p>Your image will be used for posting to social media platforms.</p>
                <p className="mt-1">Click "Post Now" to publish your content with this image.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload progress indicator */}
      {isUploading && uploadProgress > 0 && (
        <div className="mt-2">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                  {uploadProgress < 30 ? 'Reading File' :
                   uploadProgress < 70 ? 'Processing Media' :
                   uploadProgress < 90 ? 'Preparing' :
                   'Ready for Posting'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {uploadProgress}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
              <div style={{ width: `${uploadProgress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
            </div>
          </div>
        </div>
      )}

      {/* Platform selection */}
      <Card title="Select Platforms">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center mr-3">
                <span className="text-white text-xs">IG</span>
              </div>
              <span>Instagram {isInstagramConnected ? '' : '(Not Connected)'}</span>
            </div>
            <Toggle
              checked={selectedPlatforms.includes('instagram')}
              onChange={() => togglePlatform('instagram')}
              color="pink"
              disabled={!isInstagramConnected}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center mr-3">
                <span className="text-white text-xs">YT</span>
              </div>
              <span>YouTube {platformsEnabled.youtube ? '' : '(Not Connected)'}</span>
            </div>
            <Toggle
              checked={selectedPlatforms.includes('youtube')}
              onChange={() => togglePlatform('youtube')}
              color="red"
              disabled={!platformsEnabled.youtube}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center mr-3">
                <span className="text-white text-xs">TT</span>
              </div>
              <span>TikTok {platformsEnabled.tiktok ? '' : '(Not Connected)'}</span>
            </div>
            <Toggle
              checked={selectedPlatforms.includes('tiktok')}
              onChange={() => togglePlatform('tiktok')}
              color="blue"
              disabled={!platformsEnabled.tiktok}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-3">
                <span className="text-white text-xs">FB</span>
              </div>
              <span>Facebook {platformsEnabled.facebook ? '' : '(Not Connected)'}</span>
            </div>
            <Toggle
              checked={selectedPlatforms.includes('facebook')}
              onChange={() => togglePlatform('facebook')}
              color="blue"
              disabled={!platformsEnabled.facebook}
            />
          </div>
        </div>
      </Card>

      {/* Preview section */}
      <Card title="Preview">
        <div className="space-y-4">
          {/* Platform tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {selectedPlatforms.map((platform) => (
              <button
                key={platform}
                type="button"
                className={`
                  py-2 px-4 text-sm font-medium border-b-2
                  ${activePreviewPlatform === platform
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300'}
                `}
                onClick={() => setActivePreviewPlatform(platform)}
              >
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </button>
            ))}
          </div>

          {/* Preview content */}
          <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
            <PlatformPreview
              platform={activePreviewPlatform}
              content={content}
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              username={username || `${activePreviewPlatform}User`}
            />
          </div>
        </div>
      </Card>

      {/* Schedule toggle */}
      <Card title="Publish Options">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Schedule for later</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Toggle to schedule this post for a later time</p>
            </div>
            <Toggle
              checked={isScheduled}
              onChange={setIsScheduled}
            />
          </div>

          {isScheduled && (
            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule Date and Time
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <ReactDatePicker
                    selected={scheduleDate}
                    onChange={setScheduleDate}
                    showTimeSelect
                    dateFormat="MMMM d, yyyy h:mm aa"
                    minDate={new Date()}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                             p-2"
                    placeholderText="Select date and time"
                  />
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <CalendarIcon size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Error messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Submit button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || isUploading || selectedPlatforms.length === 0}
          className="min-w-[120px]"
        >
          {isSubmitting || isUploading
            ? isUploading ? 'Uploading...' : 'Posting...'
            : isScheduled
              ? 'Schedule Post'
              : 'Post Now'}
        </Button>
      </div>
    </form>
  );
};

export default CreatePostForm;