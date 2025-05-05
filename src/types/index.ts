// Platform types
export type Platform = 'instagram' | 'youtube' | 'tiktok';

// Social media post type
export interface Post {
  id: string;
  content: string; // Caption/text content
  mediaUrl?: string; // URL to image or video 
  mediaType?: 'image' | 'video';
  platforms: Platform[];
  scheduledFor: Date | null; // null means publish immediately
  publishedAt?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  platformPostIds?: Record<Platform, string>; // IDs of the posts on each platform
  createdAt: Date;
  updatedAt: Date;
}

// Comment type
export interface Comment {
  id: string;
  platform: Platform;
  postId: string;
  platformPostId: string;
  content: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
  };
  likes: number;
  createdAt: Date;
  isHidden?: boolean;
  isSpam?: boolean;
  replied?: boolean;
}

// Platform API credentials
export interface ApiCredentials {
  instagram?: {
    accessToken: string;
  };
  youtube?: {
    apiKey: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    refreshToken?: string;
  };
  tiktok?: {
    baseUrl: string;
    accessToken: string;
  };
}

// Analytics data
export interface PlatformStats {
  platform: Platform;
  totalPosts: number;
  totalComments: number;
  engagementRate: number;
  recentActivity: {
    date: Date;
    type: 'post' | 'comment';
    content: string;
  }[];
}