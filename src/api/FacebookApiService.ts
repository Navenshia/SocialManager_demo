import { Platform } from '../types';
import BaseApiService from './BaseApiService';
import useSettingsStore from '../store/useSettingsStore';
import { decryptData } from '../lib/encryption';

interface FacebookPageResponse {
  id: string;
  name: string;
}

interface FacebookPostResponse {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
}

interface FacebookCommentsResponse {
  data: FacebookComment[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

interface FacebookComment {
  id: string;
  message: string;
  created_time: string;
  from: {
    id: string;
    name: string;
  };
  like_count: number;
}

export default class FacebookApiService extends BaseApiService {
  private accessToken: string;
  private pageId: string | null = null;
  private pageName: string | null = null;

  // Cache for media to prevent duplicate API calls
  private mediaCache: FacebookPostResponse[] | null = null;
  private lastMediaFetch: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super('https://graph.facebook.com/v19.0'); // Using v19.0 for all Facebook API calls

    const settings = useSettingsStore.getState();
    const encryptedToken = settings.apiCredentials.facebook?.accessToken;

    if (!encryptedToken) {
      throw new Error('Facebook API credentials not found');
    }

    try {
      this.accessToken = decryptData(encryptedToken);
      console.log("Facebook access token decrypted successfully (first 10 chars):", this.accessToken.substring(0, 10) + "...");
    } catch (error) {
      console.error("Error decrypting Facebook access token:", error);
      throw new Error("Failed to decrypt Facebook access token");
    }

    // Add access token to every request
    this.client.interceptors.request.use(config => {
      config.params = {
        ...config.params,
        access_token: this.accessToken
      };
      console.log("Added access token to Facebook API request");
      return config;
    });
  }

  /**
   * Get basic user profile information (ID and name)
   */
  async getBasicProfileInfo(): Promise<{ id: string; name: string }> {
    try {
      console.log("Fetching Facebook basic profile info");

      // First, try to get user info directly
      try {
        const userResponse = await this.get<{ id: string; name: string }>('/me', {
          params: {
            fields: 'id,name'
          }
        });

        console.log("Facebook user info:", userResponse);

        // If we got user info, use it as a fallback
        const userId = userResponse.id;
        const userName = userResponse.name;

        // Assume any token that returns user info is valid
        // This could be a user token or a page token
        console.log("Got Facebook user/page info:", userName);
        this.pageId = userId;
        this.pageName = userName;

        // We'll still try to get pages, but we have this as a fallback

        // Try to get the user's pages
        try {
          const pagesResponse = await this.get<{ data: FacebookPageResponse[] }>('/me/accounts');
          console.log("Facebook pages response:", pagesResponse);

          if (pagesResponse.data && pagesResponse.data.length > 0) {
            // Use the first page
            const page = pagesResponse.data[0];
            this.pageId = page.id;
            this.pageName = page.name;

            console.log(`Found Facebook page: ${page.name} (${page.id})`);
            return { id: page.id, name: page.name };
          } else {
            console.warn("No Facebook pages found for this user, using user info instead");
            this.pageId = userId;
            this.pageName = userName;
            return { id: userId, name: userName };
          }
        } catch (pagesError) {
          console.error("Error fetching Facebook pages:", pagesError);
          console.log("Using user info as fallback");
          this.pageId = userId;
          this.pageName = userName;
          return { id: userId, name: userName };
        }
      } catch (userError) {
        console.error("Error fetching Facebook user info:", userError);

        // If we can't get user info directly, we can't proceed
        console.error("Unable to get Facebook user/page info with this token");
        throw userError;
      }
    } catch (error: any) {
      console.error('Error fetching Facebook profile info:', error);
      console.error('Error details:', error.response?.data || error.message);

      // Return a default value on error
      return { id: 'unknown', name: 'Facebook User' };
    }
  }

  /**
   * Create a post on Facebook with a direct file upload
   * This method is optimized for image uploads using FormData
   */
  async createPostWithFile(message: string, file: File): Promise<string> {
    try {
      // Ensure we have a user or page ID
      if (!this.pageId) {
        const profileInfo = await this.getBasicProfileInfo();
        this.pageId = profileInfo.id;
      }

      if (!this.pageId) {
        throw new Error('No Facebook user or page ID available');
      }

      console.log(`Creating Facebook post with direct file upload for page: ${this.pageName} (ID: ${this.pageId})`);
      console.log(`File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

      // Create a FormData object for the multipart/form-data request
      const formData = new FormData();
      formData.append('access_token', this.accessToken);
      formData.append('message', message);
      formData.append('source', file, file.name);

      console.log("Uploading image directly to Facebook using FormData");

      try {
        // Make a direct request to the Facebook API
        const uploadResponse = await fetch(`https://graph.facebook.com/v19.0/${this.pageId}/photos`, {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(`Facebook upload failed: ${JSON.stringify(errorData)}`);
        }

        const responseData = await uploadResponse.json();
        console.log("Facebook direct upload succeeded:", responseData);

        // Return the post ID
        return responseData.id || responseData.post_id || 'FB_POST_' + Date.now();
      } catch (directUploadError) {
        console.error("Direct file upload to Facebook failed:", directUploadError);

        // Try fallback to user feed
        console.log("Trying to post to user feed as fallback");
        try {
          const userFormData = new FormData();
          userFormData.append('access_token', this.accessToken);
          userFormData.append('message', message);
          userFormData.append('source', file, file.name);

          const userUploadResponse = await fetch(`https://graph.facebook.com/v19.0/me/photos`, {
            method: 'POST',
            body: userFormData
          });

          if (!userUploadResponse.ok) {
            const errorData = await userUploadResponse.json();
            throw new Error(`Facebook user upload failed: ${JSON.stringify(errorData)}`);
          }

          const userResponseData = await userUploadResponse.json();
          console.log("Facebook user direct upload succeeded:", userResponseData);

          // Return the post ID
          return userResponseData.id || userResponseData.post_id || 'FB_USER_POST_' + Date.now();
        } catch (userUploadError) {
          console.error("User feed direct upload failed:", userUploadError);

          // Last resort: post text-only
          console.log("Posting text-only message as final fallback");
          const response = await this.post<{ id: string }>(`/${this.pageId}/feed`, null, {
            params: {
              message: message + "\n\n[Image could not be uploaded directly. Please try again later.]"
            }
          });

          return response?.id || 'FB_TEXT_POST_' + Date.now();
        }
      }
    } catch (error: any) {
      console.error('Error creating Facebook post with file:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Create a post on Facebook using a URL
   */
  async createPost(message: string, mediaUrl?: string, mediaType?: 'image' | 'video'): Promise<string> {
    try {
      // Ensure we have a user or page ID
      if (!this.pageId) {
        const profileInfo = await this.getBasicProfileInfo();
        this.pageId = profileInfo.id;
      }

      if (!this.pageId) {
        throw new Error('No Facebook user or page ID available');
      }

      console.log(`Creating Facebook post for page: ${this.pageName} (ID: ${this.pageId})`);
      let response;

      try {
        // If we have media, post with media
        if (mediaUrl) {
          if (mediaType === 'image') {
            console.log(`Posting image to Facebook with URL: ${mediaUrl}`);

            // Check if the URL is a data URL
            if (mediaUrl.startsWith('data:')) {
              console.log("Cannot post data URLs directly to Facebook. Posting text-only message instead.");
              // Post text-only message as fallback
              response = await this.post<{ id: string }>(`/${this.pageId}/feed`, null, {
                params: {
                  message: message + "\n\n[Image could not be posted directly. Please upload to a hosting service first.]"
                }
              });
            } else {
              // Post with image URL
              try {
                // Try to validate the URL first
                const urlTest = new URL(mediaUrl);
                console.log("URL is valid:", urlTest.href);

                // Log the exact URL we're using
                console.log("Attempting to post image to Facebook with URL:", mediaUrl);

                // For Facebook, we need to try a different approach
                // Instead of using the URL directly, we'll try to fetch the image and upload it as a blob
                try {
                  console.log("Trying direct image upload approach for Facebook");

                  // Fetch the image as a blob
                  const imageResponse = await fetch(mediaUrl);
                  if (!imageResponse.ok) {
                    throw new Error(`Failed to fetch image: ${imageResponse.status}`);
                  }

                  const imageBlob = await imageResponse.blob();
                  console.log("Successfully fetched image as blob:", {
                    size: imageBlob.size,
                    type: imageBlob.type
                  });

                  // Create a FormData object for the multipart/form-data request
                  const formData = new FormData();
                  formData.append('access_token', this.accessToken);
                  formData.append('message', message);

                  // Add the image as a file
                  const fileName = mediaUrl.split('/').pop() || 'image.jpg';
                  formData.append('source', imageBlob, fileName);

                  console.log("Uploading image directly to Facebook using FormData");

                  // Make a direct request to the Facebook API
                  const uploadResponse = await fetch(`https://graph.facebook.com/v19.0/${this.pageId}/photos`, {
                    method: 'POST',
                    body: formData
                  });

                  if (!uploadResponse.ok) {
                    const errorData = await uploadResponse.json();
                    throw new Error(`Facebook upload failed: ${JSON.stringify(errorData)}`);
                  }

                  const responseData = await uploadResponse.json();
                  console.log("Facebook direct upload succeeded:", responseData);

                  // Return the response directly
                  return responseData;
                } catch (directUploadError) {
                  console.error("Direct image upload to Facebook failed:", directUploadError);
                  console.log("Falling back to URL-based approach");

                  // Continue with the URL-based approach as fallback
                }

                // Try different approaches for posting the image
                console.log("Trying multiple approaches for posting image to Facebook");

                try {
                  // Approach 1: Using /photos endpoint with url parameter
                  console.log("Approach 1: Using /photos endpoint with url parameter");
                  response = await this.post<{ id: string }>(`/${this.pageId}/photos`, null, {
                    params: {
                      message,
                      url: fbMediaUrl, // Use the Facebook-compatible URL
                    }
                  });
                  console.log("Approach 1 succeeded:", response);
                } catch (approach1Error) {
                  console.error("Approach 1 failed:", approach1Error);

                  try {
                    // Approach 2: Using /feed endpoint with link parameter
                    console.log("Approach 2: Using /feed endpoint with link parameter");
                    response = await this.post<{ id: string }>(`/${this.pageId}/feed`, null, {
                      params: {
                        message,
                        link: fbMediaUrl, // Use the Facebook-compatible URL
                      }
                    });
                    console.log("Approach 2 succeeded:", response);
                  } catch (approach2Error) {
                    console.error("Approach 2 failed:", approach2Error);

                    // Approach 3: Fallback to text-only post with image URL in the message
                    console.log("Approach 3: Fallback to text-only post with image URL in the message");
                    response = await this.post<{ id: string }>(`/${this.pageId}/feed`, null, {
                      params: {
                        message: `${message}\n\nImage: ${fbMediaUrl}`,
                      }
                    });
                    console.log("Approach 3 succeeded:", response);
                  }
                }

                console.log("Facebook image post response:", response);
              } catch (urlError) {
                console.error("Invalid URL format:", urlError);
                // Post text-only message as fallback
                response = await this.post<{ id: string }>(`/${this.pageId}/feed`, null, {
                  params: {
                    message: message + "\n\n[Image URL was invalid. Please check the URL format.]"
                  }
                });
              }
            }
          } else if (mediaType === 'video') {
            console.log(`Posting video to Facebook with URL: ${mediaUrl}`);

            // Check if the URL is a data URL
            if (mediaUrl.startsWith('data:')) {
              console.log("Cannot post data URLs directly to Facebook. Posting text-only message instead.");
              // Post text-only message as fallback
              response = await this.post<{ id: string }>(`/${this.pageId}/feed`, null, {
                params: {
                  message: message + "\n\n[Video could not be posted directly. Please upload to a hosting service first.]"
                }
              });
            } else {
              // Post with video URL
              try {
                // Try to validate the URL first
                const urlTest = new URL(mediaUrl);
                console.log("URL is valid:", urlTest.href);

                // Post with video
                response = await this.post<{ id: string }>(`/${this.pageId}/videos`, null, {
                  params: {
                    description: message,
                    file_url: mediaUrl,
                  }
                });
              } catch (urlError) {
                console.error("Invalid URL format:", urlError);
                // Post text-only message as fallback
                response = await this.post<{ id: string }>(`/${this.pageId}/feed`, null, {
                  params: {
                    message: message + "\n\n[Video URL was invalid. Please check the URL format.]"
                  }
                });
              }
            }
          }
        } else {
          console.log(`Posting text-only message to Facebook`);
          // Text-only post
          response = await this.post<{ id: string }>(`/${this.pageId}/feed`, null, {
            params: {
              message
            }
          });
        }

        console.log(`Facebook post created successfully with ID: ${response?.id}`);
        return response?.id || 'FB_POST_' + Date.now();
      } catch (postError: any) {
        console.error('Error in Facebook post creation:', postError);

        // Log detailed error information
        if (postError.response) {
          console.error('Facebook API error response:', {
            status: postError.response.status,
            statusText: postError.response.statusText,
            data: postError.response.data,
            headers: postError.response.headers
          });

          // Check for specific Facebook error codes
          if (postError.response.data && postError.response.data.error) {
            const fbError = postError.response.data.error;
            console.error('Facebook API error details:', {
              message: fbError.message,
              type: fbError.type,
              code: fbError.code,
              subcode: fbError.error_subcode,
              traceId: fbError.fbtrace_id
            });

            // Handle specific error codes
            if (fbError.code === 100) {
              console.error('Facebook API parameter error. The image URL may not be accessible to Facebook.');
            } else if (fbError.code === 190) {
              console.error('Facebook access token error. The token may have expired.');
            }
          }
        } else {
          console.error('Error details:', postError.message);
        }

        // Try posting to the user's feed as a last resort
        console.log('Trying to post to user feed as fallback');
        try {
          if (mediaUrl && !mediaUrl.startsWith('data:')) {
            // Only try to post media if it's not a data URL
            if (mediaType === 'image') {
              console.log("Trying to post image to user feed");

              try {
                // Try posting to user photos
                // Check if this is a Cloudinary URL and ensure it's Facebook-compatible
                let fbMediaUrl = mediaUrl;
                if (mediaUrl.includes('cloudinary.com')) {
                  console.log("Detected Cloudinary URL in fallback, ensuring it's Facebook-compatible");

                  // Make sure the URL has a proper image extension
                  if (!mediaUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
                    fbMediaUrl = `${mediaUrl}.jpg`;
                    console.log("Added .jpg extension for Facebook compatibility:", fbMediaUrl);
                  }
                }

                response = await this.post<{ id: string }>(`/me/photos`, null, {
                  params: {
                    message,
                    url: fbMediaUrl, // Use the Facebook-compatible URL
                  }
                });
                console.log("Successfully posted image to user photos:", response);
              } catch (photoError) {
                console.error("Failed to post to user photos:", photoError);

                // Try posting to feed with link
                console.log("Trying to post to user feed with link parameter");
                // Use the same fbMediaUrl from above
                response = await this.post<{ id: string }>(`/me/feed`, null, {
                  params: {
                    message,
                    link: fbMediaUrl, // Use the Facebook-compatible URL
                  }
                });
              }
            } else if (mediaType === 'video') {
              console.log("Trying to post video to user feed");
              response = await this.post<{ id: string }>(`/me/videos`, null, {
                params: {
                  description: message,
                  file_url: mediaUrl,
                }
              });
            }
          } else {
            // Post text-only as a last resort
            console.log("Posting text-only to user feed as final fallback");
            let finalMessage = message;

            // Add a note if we had media but couldn't post it
            if (mediaUrl && mediaUrl.startsWith('data:')) {
              finalMessage += "\n\n[Media could not be posted directly. Please upload to a hosting service first.]";
            }

            response = await this.post<{ id: string }>(`/me/feed`, null, {
              params: {
                message: finalMessage
              }
            });
          }

          console.log(`Facebook post created on user feed with ID: ${response?.id}`);
          return response?.id || 'FB_POST_' + Date.now();
        } catch (userPostError) {
          console.error('Error posting to user feed:', userPostError);
          throw userPostError;
        }
      }
    } catch (error: any) {
      console.error('Error creating Facebook post:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get posts from the page
   */
  async getPosts(limit: number = 10) {
    try {
      // Ensure we have a page ID
      if (!this.pageId) {
        const profileInfo = await this.getBasicProfileInfo();
        this.pageId = profileInfo.id;
      }

      console.log(`Fetching posts for Facebook page: ${this.pageName} (ID: ${this.pageId})`);

      // Try to get posts from the page
      try {
        const postsResponse = await this.get<{ data: any[] }>(`/${this.pageId}/posts`, {
          params: {
            fields: 'id,message,created_time,permalink_url,full_picture',
            limit
          }
        });

        console.log(`Retrieved ${postsResponse.data?.length || 0} posts from Facebook page`);
        return postsResponse;
      } catch (error) {
        console.error('Error fetching posts from page:', error);

        // Last resort: try to get user feed
        try {
          console.log('Trying to get user feed as last resort');
          const feedResponse = await this.get<{ data: any[] }>(`/me/feed`, {
            params: {
              fields: 'id,message,created_time,permalink_url,full_picture',
              limit
            }
          });

          console.log(`Retrieved ${feedResponse.data?.length || 0} posts from user feed`);
          return feedResponse;
        } catch (feedError) {
          console.error('Error fetching user feed:', feedError);
          throw feedError;
        }
      }
    } catch (error: any) {
      console.error('Error getting Facebook posts:', error);
      console.error('Error details:', error.response?.data || error.message);

      // Return empty data on error
      return { data: [] };
    }
  }

  /**
   * Get comments for a specific post
   */
  async getComments(postId: string) {
    try {
      console.log(`Fetching comments for Facebook post ${postId}`);

      const response = await this.get<{ data: any[] }>(`/${postId}/comments`, {
        params: {
          fields: 'id,message,created_time,from,like_count',
          limit: 25
        }
      });

      return response;
    } catch (error: any) {
      console.error(`Error fetching comments for Facebook post ${postId}:`, error);
      console.error('Error details:', error.response?.data || error.message);

      // Return empty data on error
      return { data: [] };
    }
  }

  /**
   * Reply to a comment
   */
  async replyToComment(postId: string, message: string, commentId: string) {
    try {
      console.log(`Replying to Facebook comment ${commentId} on post ${postId}`);

      const response = await this.post<{ id: string }>(`/${commentId}/comments`, null, {
        params: {
          message
        }
      });

      return response;
    } catch (error: any) {
      console.error(`Error replying to Facebook comment ${commentId}:`, error);
      console.error('Error details:', error.response?.data || error.message);
      throw this.handleApiError(error);
    }
  }

  async getAccountStats() {
    try {
      // Ensure we have a user or page ID
      if (!this.pageId) {
        const profileInfo = await this.getBasicProfileInfo();
        this.pageId = profileInfo.id;
      }

      if (!this.pageId) {
        throw new Error('No Facebook user or page ID available');
      }

      console.log(`Fetching Facebook stats for page: ${this.pageName} (ID: ${this.pageId})`);

      let posts = [];
      let totalComments = 0;
      const recentActivity = [];

      try {
        console.log(`Fetching posts with pageId: ${this.pageId}`);
        const postsResponse = await this.get<{ data: FacebookPostResponse[] }>(`/${this.pageId}/posts`, {
          params: {
            fields: 'id,message,created_time,permalink_url',
            limit: 25
          }
        });

        posts = postsResponse.data || [];
        console.log(`Found ${posts.length} posts for Facebook ID ${this.pageId}`);

        // Process each post to get comments
        for (const post of posts) {
          // Add post to recent activity
          if (post.message) {
            recentActivity.push({
              date: new Date(post.created_time),
              type: 'post' as const,
              content: post.message
            });
          }

          // Get comments for this post
          try {
            const commentsResponse = await this.get<FacebookCommentsResponse>(`/${post.id}/comments`, {
              params: {
                fields: 'id,message,created_time,from,like_count',
                limit: 10
              }
            });

            const comments = commentsResponse.data || [];
            totalComments += comments.length;

            // Add comments to recent activity
            for (const comment of comments) {
              recentActivity.push({
                date: new Date(comment.created_time),
                type: 'comment' as const,
                content: comment.message
              });
            }
          } catch (error) {
            console.error(`Error fetching comments for post ${post.id}:`, error);
          }
        }
      } catch (postsError) {
        console.error('Error fetching Facebook posts:', postsError);

        // If getting posts from the page/user fails, try getting feed as fallback
        console.log('Trying to get user feed as last resort');
        try {
          const feedResponse = await this.get<{ data: FacebookPostResponse[] }>('/me/feed', {
            params: {
              fields: 'id,message,created_time,permalink_url',
              limit: 25
            }
          });

          posts = feedResponse.data || [];
          console.log(`Found ${posts.length} posts in user feed`);

          // Process feed posts
          for (const post of posts) {
            if (post.message) {
              recentActivity.push({
                date: new Date(post.created_time),
                type: 'post' as const,
                content: post.message
              });
            }
          }
        } catch (feedError) {
          console.error('Error fetching user feed:', feedError);
        }
      }

      // Sort recent activity by date
      recentActivity.sort((a, b) => b.date.getTime() - a.date.getTime());

      const stats = {
        platform: 'facebook' as Platform,
        totalPosts: posts.length,
        totalComments,
        engagementRate: posts.length > 0 ? totalComments / posts.length : 0,
        recentActivity: recentActivity.slice(0, 5)
      };

      console.log('Facebook stats:', stats);
      return stats;
    } catch (error: any) {
      console.error('Error getting Facebook account stats:', error);
      console.error('Error details:', error.response?.data || error.message);

      // Return default stats on error
      return {
        platform: 'facebook' as Platform,
        totalPosts: 0,
        totalComments: 0,
        engagementRate: 0,
        recentActivity: []
      };
    }
  }
}
