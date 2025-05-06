import BaseApiService from './BaseApiService';
import { decryptData } from '../lib/encryption';
import { Platform } from '../types';
import useSettingsStore from '../store/useSettingsStore';

interface InstagramMediaResponse {
  id: string;
  media_type: string;
  media_url?: string;
  permalink: string;
  timestamp: string;
  caption?: string;
}

interface InstagramCommentsResponse {
  data: Array<{
    id: string;
    text: string;
    timestamp: string;
    username: string;
    like_count: number;
  }>;
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export default class InstagramApiService extends BaseApiService {
  private accessToken: string;

  constructor() {
    super('https://graph.instagram.com/v19.0'); // Using v19.0 for all Instagram API calls

    const settings = useSettingsStore.getState();
    const encryptedToken = settings.apiCredentials.instagram?.accessToken;

    if (!encryptedToken) {
      throw new Error('Instagram API credentials not found');
    }

    this.accessToken = decryptData(encryptedToken);

    // Add access token to every request
    this.client.interceptors.request.use(config => {
      config.params = {
        ...config.params,
        access_token: this.accessToken
      };
      return config;
    });
  }

  /**
   * Get basic user profile information (ID and username)
   */
  async getBasicProfileInfo(): Promise<{ id: string; username: string }> {
    try {
      console.log("Fetching Instagram basic profile info");

      const response = await this.get<{ id: string; username: string }>('/me', {
        params: {
          fields: 'id,username'
        }
      });

      if (!response.username) {
        console.warn("Username not found in API response, defaulting.");
        // Fallback if the API surprisingly doesn't return a username
        return { ...response, username: 'Instagram User' };
      }

      console.log("Fetched username:", response.username);
      return response;
    } catch (error) {
      console.error('Error getting Instagram profile info:', error);
      // Provide a default value in case of error to avoid breaking the UI completely
      return { id: 'error', username: 'Instagram User' };
      // Rethrowing might be better depending on desired error handling strategy
      // throw this.handleApiError(error);
    }
  }

  /**
   * Post a photo or video to Instagram
   * Note: Direct publishing to Instagram has limitations and may require additional approvals from Meta
   */
  async createPost(caption: string, mediaUrl: string, mediaType: 'image' | 'video'): Promise<string> {
    try {
      console.log("Creating Instagram post with:", { caption, mediaType });
      console.log("Media URL being sent to Instagram API:", mediaUrl);

      // Check if mediaUrl is a data URL (starts with data:)
      if (mediaUrl.startsWith('data:')) {
        console.log("Converting data URL to simulated public URL for Instagram API");

        // In a real app, we'd upload this to cloud storage
        // For this demo, we'll simulate a successful post with a fake ID

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const fakePostId = 'ig_post_' + Math.random().toString(36).substring(2, 15);
        console.log("Simulated Instagram post created with ID:", fakePostId);
        return fakePostId;
      }

      // If not a data URL, proceed with normal API call
      // Step 1: Create a container
      // The Instagram Graph API expects parameters in the query string, not the body
      console.log("Step 1: Creating media container with the following parameters:");
      console.log({
        caption,
        image_url: mediaType === 'image' ? mediaUrl : undefined,
        video_url: mediaType === 'video' ? mediaUrl : undefined,
        media_type: mediaType.toUpperCase(),
      });

      const containerData = await this.post<{ id: string }>('/me/media', null, {
        params: {
          caption,
          image_url: mediaType === 'image' ? mediaUrl : undefined,
          video_url: mediaType === 'video' ? mediaUrl : undefined,
          media_type: mediaType.toUpperCase(),
        }
      });

      console.log("Container created successfully with ID:", containerData.id);

      // Step 2: Publish the container
      // The Instagram Graph API expects parameters in the query string, not the body
      console.log("Step 2: Publishing media container with ID:", containerData.id);

      const publishData = await this.post<{ id: string }>('/me/media_publish', null, {
        params: {
          creation_id: containerData.id
        }
      });

      console.log("Publishing successful! New post created with ID:", publishData.id);

      console.log("Instagram post created successfully with ID:", publishData.id);
      return publishData.id;
    } catch (error: any) {
      console.error('Error creating Instagram post:', error);

      // Provide more detailed error messages based on the error type
      if (error.response) {
        console.error('API Error Response:', error.response.data);

        // Check for common error codes
        if (error.response.status === 400) {
          const errorMessage = error.response.data?.error?.message || 'Invalid parameters';
          console.error('Bad request error:', errorMessage);

          // Check for specific error messages
          if (errorMessage.includes('media container')) {
            throw new Error(`Failed to create media container: ${errorMessage}. Please check your media URL and format.`);
          } else if (errorMessage.includes('creation_id')) {
            throw new Error(`Failed to publish media: ${errorMessage}. The container ID may be invalid.`);
          } else {
            throw new Error(`Bad request: ${errorMessage}`);
          }
        } else if (error.response.status === 401 || error.response.status === 403) {
          throw new Error('Authentication error: Your access token may be invalid or expired, or you may not have permission to publish content.');
        } else if (error.response.status === 404) {
          throw new Error('Resource not found. The API endpoint may have changed or the resource does not exist.');
        } else if (error.response.status >= 500) {
          throw new Error('Instagram server error. Please try again later.');
        }
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Network error: No response received from Instagram API. Please check your internet connection.');
      }

      // If we couldn't handle the error specifically, use the generic handler
      throw this.handleApiError(error);
    }
  }

  /**
   * Get details for a specific post by ID
   */
  async getPostDetails(mediaId: string): Promise<InstagramMediaResponse> {
    try {
      console.log(`Fetching details for Instagram post ${mediaId}`);

      const response = await this.get<InstagramMediaResponse>(`/${mediaId}`, {
        params: {
          fields: 'id,media_type,media_url,permalink,timestamp,caption'
        }
      });

      return response;
    } catch (error: any) {
      console.error(`Error getting details for post ${mediaId}:`, error);

      // For demo purposes, if the ID is a simulated one (starts with ig_post_),
      // return a mock response
      if (mediaId.startsWith('ig_post_')) {
        console.log("Returning simulated post details for demo post");
        return {
          id: mediaId,
          media_type: 'IMAGE',
          permalink: 'https://instagram.com/p/demo',
          timestamp: new Date().toISOString(),
          caption: 'This is a simulated post created in demo mode'
        };
      }

      throw this.handleApiError(error);
    }
  }

  // Cache for media to prevent duplicate API calls
  private mediaCache: InstagramMediaResponse[] | null = null;
  private lastMediaFetch: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL

  /**
   * Get all media for the user
   */
  async getMedia(limit: number = 25, forceRefresh: boolean = false): Promise<InstagramMediaResponse[]> {
    try {
      // Check if we have cached data and it's still fresh
      const now = Date.now();
      if (!forceRefresh && this.mediaCache && (now - this.lastMediaFetch) < this.CACHE_TTL) {
        console.log("Using cached Instagram media");
        return this.mediaCache;
      }

      console.log("Fetching Instagram media from API");

      const response = await this.get<{ data: InstagramMediaResponse[] }>('/me/media', {
        params: {
          fields: 'id,media_type,media_url,permalink,timestamp,caption',
          limit
        }
      });

      // Update cache
      this.mediaCache = response.data || [];
      this.lastMediaFetch = now;

      return this.mediaCache;
    } catch (error) {
      console.error('Error getting Instagram media:', error);

      // If we have cached data, return it even if it's stale
      if (this.mediaCache) {
        console.log("API error, using stale cached data");
        return this.mediaCache;
      }

      throw this.handleApiError(error);
    }
  }

  /**
   * Get comments for a specific post
   */
  async getComments(mediaId: string, forceRefresh: boolean = false): Promise<InstagramCommentsResponse> {
    try {
      // Check if we have cached comments and they're still fresh
      const now = Date.now();
      if (!forceRefresh &&
          this.commentsCache.has(mediaId) &&
          this.lastCommentsRefresh.has(mediaId) &&
          (now - (this.lastCommentsRefresh.get(mediaId) || 0)) < this.CACHE_TTL) {
        console.log(`Using cached comments for Instagram post ${mediaId}`);
        return this.commentsCache.get(mediaId) as InstagramCommentsResponse;
      }

      console.log(`Fetching comments for Instagram post ${mediaId}`);

      // For all posts, including simulated ones, try to call the API
      const response = await this.get<InstagramCommentsResponse>(`/${mediaId}/comments`, {
        params: {
          fields: 'id,text,timestamp,username,like_count',
          limit: 50
        }
      });

      // Update cache
      this.commentsCache.set(mediaId, response);
      this.lastCommentsRefresh.set(mediaId, now);

      console.log(`Retrieved ${response.data?.length || 0} comments for post ${mediaId}`);
      return response;
    } catch (error: any) {
      console.error(`Error getting comments for post ${mediaId}:`, error);

      // If we have cached comments, return them even if they're stale
      if (this.commentsCache.has(mediaId)) {
        console.log(`API error, using stale cached comments for post ${mediaId}`);
        return this.commentsCache.get(mediaId) as InstagramCommentsResponse;
      }

      // For simulated posts that would fail with the API, return an empty comments array
      // rather than completely failing
      if (mediaId.startsWith('ig_post_')) {
        console.warn(`Post ${mediaId} is a simulated post; returning empty comments array`);
        return { data: [] };
      }

      throw this.handleApiError(error);
    }
  }

  /**
   * Reply to a comment
   * @param mediaId The ID of the post/media
   * @param commentText The text of the reply
   * @param commentId Optional ID of the comment to reply to (for threaded replies)
   */
  async replyToComment(mediaId: string, commentText: string, commentId?: string): Promise<{ id: string }> {
    try {
      console.log(`Attempting to reply to comment on post ${mediaId} with text: ${commentText}`);

      // Validate inputs
      if (!mediaId) {
        throw new Error('Media ID is required to reply to a comment');
      }

      if (!commentText || commentText.trim() === '') {
        throw new Error('Comment text cannot be empty');
      }

      // Check if this is a simulated post
      if (mediaId.startsWith('ig_post_')) {
        console.warn(`Post ${mediaId} is simulated; real commenting not possible`);
        throw new Error('Cannot comment on simulated posts. Connect a real Instagram account to enable commenting.');
      }

      // Make sure we're using the raw comment ID without any prefixes
      // The Instagram API expects just the numeric ID
      const cleanCommentId = commentId && commentId.includes('_')
        ? commentId.split('_').pop() || commentId
        : commentId;

      let response;

      // If we have a commentId, we're replying to a specific comment using the /replies endpoint
      if (commentId) {
        console.log(`This is a reply to comment ${commentId} (clean ID: ${cleanCommentId})`);
        console.log(`Using the /replies endpoint for threaded reply`);

        // For threaded replies, we need to use the comment's endpoint with /replies
        // The Instagram Graph API expects parameters in the query string, not the body
        // This is different from how we post top-level comments

        // Use the comment's endpoint with /replies
        response = await this.post<{ id: string }>(`/${cleanCommentId}/replies`, null, {
          params: {
            message: commentText
          }
        });

        console.log(`Successfully posted threaded reply to comment ${cleanCommentId} with new comment ID: ${response.id}`);
      } else {
        // If no commentId, we're posting a top-level comment to the post
        console.log(`Posting a top-level comment to post ${mediaId}`);

        // Use the post's endpoint for top-level comments
        // The Instagram Graph API expects parameters in the query string, not the body
        response = await this.post<{ id: string }>(`/${mediaId}/comments`, null, {
          params: {
            message: commentText
          }
        });

        console.log(`Successfully posted comment to post ${mediaId} with comment ID: ${response.id}`);
      }

      return response;
    } catch (error: any) {
      console.error('Error replying to comment:', error);

      // Provide more detailed error messages based on the error type
      if (error.response) {
        console.error('API Error Response:', error.response.data);

        // Check for common error codes
        if (error.response.status === 400) {
          throw new Error(`Bad request: ${error.response.data?.error?.message || 'Invalid parameters'}`);
        } else if (error.response.status === 401 || error.response.status === 403) {
          throw new Error('Authentication error: Your access token may be invalid or expired');
        } else if (error.response.status === 404) {
          if (commentId) {
            throw new Error(`Comment with ID ${commentId} not found. It may have been deleted or is not accessible.`);
          } else {
            throw new Error(`Post with ID ${mediaId} not found. It may have been deleted or is not accessible.`);
          }
        }
      }

      throw this.handleApiError(error);
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<{ success: boolean }> {
    try {
      console.log(`Attempting to delete comment ${commentId}`);

      // Always try to use the real API first
      await this.delete<any>(`/${commentId}`);
      console.log(`Successfully deleted comment ${commentId}`);
      return { success: true };
    } catch (error: any) {
      console.error(`Error deleting comment ${commentId}:`, error);

      // If this is a simulated comment ID, throw a specific error
      if (commentId.startsWith('comment_')) {
        console.warn(`Comment ${commentId} appears to be a simulated ID`);
        throw new Error('Cannot delete simulated comments. Connect a real Instagram account to enable comment management.');
      }

      throw this.handleApiError(error);
    }
  }

  // Cache for comments to prevent duplicate API calls
  private commentsCache: Map<string, InstagramCommentsResponse> = new Map();
  private lastCommentsRefresh: Map<string, number> = new Map();

  /**
   * Get basic statistics for the account
   */
  async getAccountStats() {
    try {
      // Use cached media if available
      const mediaResponse = await this.getMedia(25, false);

      let totalComments = 0;
      const posts = mediaResponse;
      const recentActivity = [];

      // Handle the case where there are no real posts
      if (posts.length === 0) {
        console.log("No posts found, returning simulated stats");
        return {
          platform: 'instagram' as Platform,
          totalPosts: 0,
          totalComments: 0,
          engagementRate: 0,
          recentActivity: []
        };
      }

      // Get comment counts for the last 5 posts
      for (let i = 0; i < Math.min(5, posts.length); i++) {
        const post = posts[i];
        try {
          const comments = await this.getComments(post.id);

          totalComments += comments.data?.length || 0;

          // Add to recent activity
          recentActivity.push({
            date: new Date(post.timestamp),
            type: 'post' as const,
            content: post.caption || 'Image post'
          });

          // Add the most recent comment to activity
          if (comments.data?.length > 0) {
            recentActivity.push({
              date: new Date(comments.data[0].timestamp),
              type: 'comment' as const,
              content: comments.data[0].text
            });
          }
        } catch (error: any) {
          console.error(`Error processing post ${post.id}:`, error);
        }
      }

      // Sort recent activity by date
      recentActivity.sort((a, b) => b.date.getTime() - a.date.getTime());

      return {
        platform: 'instagram' as Platform,
        totalPosts: posts.length,
        totalComments,
        engagementRate: posts.length > 0 ? totalComments / posts.length : 0,
        recentActivity: recentActivity.slice(0, 5)
      };
    } catch (error: any) {
      console.error('Error getting account stats:', error);
      throw this.handleApiError(error);
    }
  }
}