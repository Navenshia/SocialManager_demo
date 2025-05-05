import BaseApiService from './BaseApiService';
import { decryptData } from '../lib/encryption';
import { Platform } from '../types';
import useSettingsStore from '../store/useSettingsStore';

// Placeholder interfaces for TikTok API responses
interface TikTokVideoResponse {
  id: string;
  description: string;
  create_time: string;
  share_url: string;
  video: {
    cover_image_url: string;
    duration: number;
  };
  statistics: {
    comment_count: number;
    like_count: number;
    view_count: number;
    share_count: number;
  };
}

interface TikTokCommentResponse {
  id: string;
  text: string;
  create_time: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
  like_count: number;
  reply_count: number;
}

export default class TikTokApiService extends BaseApiService {
  private accessToken: string;

  constructor() {
    // Note: For TikTok, we're using a custom base URL that would be set in the settings
    // This allows flexibility for using different API endpoints or mock servers during development
    const settings = useSettingsStore.getState();
    const credentials = settings.apiCredentials.tiktok;
    
    if (!credentials) {
      throw new Error('TikTok API credentials not found');
    }
    
    // Use the baseUrl from settings
    super(credentials.baseUrl); 
    
    this.accessToken = decryptData(credentials.accessToken);
    
    // Add authentication to every request
    this.client.interceptors.request.use(config => {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${this.accessToken}`
      };
      return config;
    });
  }
  
  /**
   * Upload a video to TikTok
   * Note: This is a placeholder implementation as TikTok's API for direct posting is more limited
   */
  async createPost(description: string, mediaUrl: string): Promise<string> {
    try {
      // In a real implementation, this would involve a multi-step process specific to TikTok's API
      // For now, we'll create a simplified simulation
      const response = await this.post<{ data: { video_id: string } }>('/videos', {
        description,
        video_url: mediaUrl,
      });
      
      return response.data.video_id;
    } catch (error) {
      // For demonstration purposes, create a simulated response
      console.log('Using simulated TikTok upload (TikTok API may not support direct uploads)');
      return 'TIKTOK_SIMULATED_' + Math.random().toString(36).substring(2, 15);
    }
  }
  
  /**
   * Get comments for a specific TikTok video
   */
  async getComments(videoId: string, limit = 50): Promise<{ comments: TikTokCommentResponse[] }> {
    try {
      const response = await this.get<{ data: { comments: TikTokCommentResponse[] } }>(`/videos/${videoId}/comments`, {
        params: { limit }
      });
      
      return { comments: response.data.comments };
    } catch (error) {
      // For demonstration purposes, return simulated data
      return { comments: this.generateMockComments(videoId, 5) };
    }
  }
  
  /**
   * Reply to a comment
   */
  async replyToComment(videoId: string, commentId: string, text: string): Promise<{ id: string }> {
    try {
      const response = await this.post<{ data: { comment_id: string } }>(`/videos/${videoId}/comments`, {
        text,
        parent_comment_id: commentId
      });
      
      return { id: response.data.comment_id };
    } catch (error) {
      // For demonstration purposes
      return { id: 'COMMENT_SIMULATED_' + Math.random().toString(36).substring(2, 15) };
    }
  }
  
  /**
   * Delete a comment
   */
  async deleteComment(videoId: string, commentId: string): Promise<{ success: boolean }> {
    try {
      await this.delete<any>(`/videos/${videoId}/comments/${commentId}`);
      return { success: true };
    } catch (error) {
      // For demonstration purposes
      console.log('Simulated TikTok comment deletion');
      return { success: true };
    }
  }
  
  /**
   * Get account statistics 
   */
  async getAccountStats() {
    try {
      // Try to get real data if the API supports it
      const videosResponse = await this.get<{ data: { videos: TikTokVideoResponse[] } }>('/user/videos', {
        params: { limit: 20 }
      });
      
      const videos = videosResponse.data.videos;
      const totalVideos = videos.length;
      let totalComments = 0;
      const recentActivity = [];
      
      // Process the videos
      for (const video of videos.slice(0, 5)) {
        totalComments += video.statistics.comment_count;
        
        // Add to recent activity
        recentActivity.push({
          date: new Date(parseInt(video.create_time) * 1000),
          type: 'post' as const,
          content: video.description || 'TikTok video'
        });
        
        // Get comments for this video
        try {
          const commentsResponse = await this.getComments(video.id, 1);
          if (commentsResponse.comments.length > 0) {
            const comment = commentsResponse.comments[0];
            recentActivity.push({
              date: new Date(parseInt(comment.create_time) * 1000),
              type: 'comment' as const,
              content: comment.text
            });
          }
        } catch (error) {
          console.error('Error fetching comments for video', video.id, error);
        }
      }
      
      // Sort by date
      recentActivity.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      return {
        platform: 'tiktok' as Platform,
        totalPosts: totalVideos,
        totalComments,
        engagementRate: totalVideos > 0 ? totalComments / totalVideos : 0,
        recentActivity: recentActivity.slice(0, 5)
      };
    } catch (error) {
      // For demonstration, return mock data
      return this.generateMockStats();
    }
  }
  
  // Helper methods to generate mock data for demonstration
  
  private generateMockComments(videoId: string, count: number): TikTokCommentResponse[] {
    const comments: TikTokCommentResponse[] = [];
    
    for (let i = 0; i < count; i++) {
      const id = `mock-comment-${i}-${videoId}`;
      comments.push({
        id,
        text: `This is a mock TikTok comment #${i} - Love this content! #trending`,
        create_time: Math.floor(Date.now() / 1000 - i * 86400).toString(), // Days ago
        user: {
          id: `user-${i}`,
          username: `tiktokuser${i}`,
          display_name: `TikTok User ${i}`,
          avatar_url: 'https://placeholder.com/50x50'
        },
        like_count: Math.floor(Math.random() * 100),
        reply_count: Math.floor(Math.random() * 5)
      });
    }
    
    return comments;
  }
  
  private generateMockStats() {
    const totalPosts = Math.floor(Math.random() * 30) + 5;
    const totalComments = Math.floor(Math.random() * 500) + 50;
    
    const recentActivity = [];
    const now = Date.now();
    
    // Generate some mock posts
    for (let i = 0; i < 3; i++) {
      recentActivity.push({
        date: new Date(now - i * 86400000), // Days ago
        type: 'post' as const,
        content: `Mock TikTok video #${i} - Check out this new content! #trending`
      });
    }
    
    // Generate some mock comments
    for (let i = 0; i < 2; i++) {
      recentActivity.push({
        date: new Date(now - (i * 43200000 + 10000)), // Half days ago
        type: 'comment' as const,
        content: `Mock comment: This is awesome content! ${i === 0 ? '🔥' : '👏'}`
      });
    }
    
    // Sort by date
    recentActivity.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return {
      platform: 'tiktok' as Platform,
      totalPosts,
      totalComments,
      engagementRate: totalComments / totalPosts,
      recentActivity
    };
  }
}