import BaseApiService from './BaseApiService';
import { decryptData } from '../lib/encryption';
import { Platform } from '../types';
import useSettingsStore from '../store/useSettingsStore';

interface YouTubeVideoResource {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

interface YouTubeCommentResource {
  id: string;
  snippet: {
    videoId: string;
    textDisplay: string;
    textOriginal: string;
    authorDisplayName: string;
    authorProfileImageUrl: string;
    authorChannelId: {
      value: string;
    };
    likeCount: number;
    publishedAt: string;
    updatedAt: string;
  };
}

export default class YouTubeApiService extends BaseApiService {
  private apiKey: string;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private refreshToken?: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor() {
    super('https://www.googleapis.com/youtube/v3');
    
    const settings = useSettingsStore.getState();
    const credentials = settings.apiCredentials.youtube;
    
    if (!credentials) {
      throw new Error('YouTube API credentials not found');
    }
    
    this.apiKey = decryptData(credentials.apiKey);
    this.clientId = decryptData(credentials.clientId);
    this.clientSecret = decryptData(credentials.clientSecret);
    this.redirectUri = credentials.redirectUri;
    this.refreshToken = credentials.refreshToken ? decryptData(credentials.refreshToken) : undefined;
    
    // Add API key to every request if no OAuth token is available
    this.client.interceptors.request.use(async (config) => {
      // If we have an OAuth token and it's valid, use it
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${this.accessToken}`
        };
      } 
      // If we have a refresh token, get a new access token
      else if (this.refreshToken) {
        await this.refreshAccessToken();
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${this.accessToken}`
        };
      } 
      // Otherwise, fall back to API key
      else {
        config.params = {
          ...config.params,
          key: this.apiKey
        };
      }
      return config;
    });
  }
  
  /**
   * Refresh the OAuth access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await this.client.post<{
        access_token: string;
        expires_in: number;
      }>('https://oauth2.googleapis.com/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      });
      
      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw new Error('Failed to refresh YouTube access token');
    }
  }
  
  /**
   * Upload a video to YouTube
   */
  async createPost(title: string, description: string, mediaUrl: string): Promise<string> {
    try {
      // First, initiate a resumable upload
      const initiateResponse = await this.post<any>('/videos', {}, {
        params: {
          part: 'snippet,status',
          uploadType: 'resumable'
        },
        data: {
          snippet: {
            title,
            description,
            categoryId: '22' // People & Blogs category
          },
          status: {
            privacyStatus: 'public'
          }
        }
      });
      
      // Get the upload URL from the response headers
      const uploadUrl = initiateResponse.headers?.location;
      if (!uploadUrl) {
        throw new Error('Failed to get YouTube upload URL');
      }
      
      // In a real implementation, you would now upload the actual video file to this URL
      // For this simplified example, we'll just simulate a successful upload
      console.log(`Upload URL received for ${title}: ${uploadUrl}`);
      
      // Simulate video ID return
      const videoId = 'SIMULATED_' + Math.random().toString(36).substring(2, 15);
      return videoId;
    } catch (error) {
      this.handleApiError(error);
    }
  }
  
  /**
   * Get comments for a specific video
   */
  async getComments(videoId: string, maxResults = 100) {
    try {
      return await this.get<{
        items: YouTubeCommentResource[];
        nextPageToken?: string;
      }>('/commentThreads', {
        params: {
          part: 'snippet',
          videoId,
          maxResults
        }
      });
    } catch (error) {
      this.handleApiError(error);
    }
  }
  
  /**
   * Reply to a comment
   */
  async replyToComment(commentId: string, text: string) {
    try {
      return await this.post<{ id: string }>('/comments', {
        snippet: {
          parentId: commentId,
          textOriginal: text
        }
      }, {
        params: {
          part: 'snippet'
        }
      });
    } catch (error) {
      this.handleApiError(error);
    }
  }
  
  /**
   * Delete a comment
   */
  async deleteComment(commentId: string) {
    try {
      await this.delete<void>(`/comments`, {
        params: {
          id: commentId
        }
      });
      return { success: true };
    } catch (error) {
      this.handleApiError(error);
    }
  }
  
  /**
   * Get basic statistics for the channel
   */
  async getAccountStats() {
    try {
      // Get channel info
      const channelResponse = await this.get<{ items: any[] }>('/channels', {
        params: {
          part: 'contentDetails,statistics',
          mine: true
        }
      });
      
      if (!channelResponse.items || channelResponse.items.length === 0) {
        throw new Error('No channel found');
      }
      
      const channel = channelResponse.items[0];
      const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
      const totalVideos = parseInt(channel.statistics.videoCount || '0', 10);
      
      // Get recent videos
      const videosResponse = await this.get<{ items: YouTubeVideoResource[] }>('/playlistItems', {
        params: {
          part: 'snippet,contentDetails',
          playlistId: uploadsPlaylistId,
          maxResults: 10
        }
      });
      
      const videoIds = videosResponse.items.map(item => item.snippet.resourceId.videoId).join(',');
      
      // Get video statistics
      const videoDetailsResponse = await this.get<{ items: YouTubeVideoResource[] }>('/videos', {
        params: {
          part: 'statistics,snippet',
          id: videoIds
        }
      });
      
      let totalComments = 0;
      const recentActivity = [];
      
      // Process video data
      for (const video of videoDetailsResponse.items) {
        const commentCount = parseInt(video.statistics?.commentCount || '0', 10);
        totalComments += commentCount;
        
        // Add video to recent activity
        recentActivity.push({
          date: new Date(video.snippet.publishedAt),
          type: 'post' as const,
          content: video.snippet.title
        });
        
        // Get most recent comment if there are any
        if (commentCount > 0) {
          try {
            const comments = await this.getComments(video.id, 1);
            if (comments?.items?.length > 0) {
              const comment = comments.items[0].snippet.topLevelComment.snippet;
              recentActivity.push({
                date: new Date(comment.publishedAt),
                type: 'comment' as const,
                content: comment.textDisplay
              });
            }
          } catch (error) {
            console.error('Error fetching comments for video', video.id, error);
          }
        }
      }
      
      // Sort recent activity by date
      recentActivity.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      return {
        platform: 'youtube' as Platform,
        totalPosts: totalVideos,
        totalComments,
        engagementRate: totalVideos > 0 ? totalComments / totalVideos : 0,
        recentActivity: recentActivity.slice(0, 5)
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }
}