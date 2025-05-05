import { create } from 'zustand';
import { Post, Platform } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PostsState {
  posts: Post[];
  drafts: Post[];
  scheduled: Post[];
  published: Post[];
  failed: Post[];
  
  // Actions
  createPost: (content: string, mediaUrl?: string, mediaType?: 'image' | 'video', platforms?: Platform[]) => Post;
  updatePost: (id: string, data: Partial<Post>) => void;
  deletePost: (id: string) => void;
  schedulePost: (id: string, scheduleDate: Date) => void;
  publishPost: (id: string, platformPostIds: Record<Platform, string>) => void;
  markAsFailed: (id: string, error?: string) => void;
  filterPosts: (status?: Post['status'], platform?: Platform, startDate?: Date, endDate?: Date) => Post[];
}

const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],
  drafts: [],
  scheduled: [],
  published: [],
  failed: [],
  
  createPost: (content, mediaUrl, mediaType, platforms = ['instagram', 'youtube', 'tiktok']) => {
    const now = new Date();
    const newPost: Post = {
      id: uuidv4(),
      content,
      mediaUrl,
      mediaType,
      platforms,
      scheduledFor: null,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    
    set(state => {
      const updatedPosts = [...state.posts, newPost];
      const updatedDrafts = [...state.drafts, newPost];
      
      return {
        posts: updatedPosts,
        drafts: updatedDrafts,
      };
    });
    
    return newPost;
  },
  
  updatePost: (id, data) => {
    set(state => {
      const updatedPosts = state.posts.map(post => 
        post.id === id ? { ...post, ...data, updatedAt: new Date() } : post
      );
      
      // Update categorized lists
      const updatedDrafts = updatedPosts.filter(post => post.status === 'draft');
      const updatedScheduled = updatedPosts.filter(post => post.status === 'scheduled');
      const updatedPublished = updatedPosts.filter(post => post.status === 'published');
      const updatedFailed = updatedPosts.filter(post => post.status === 'failed');
      
      return {
        posts: updatedPosts,
        drafts: updatedDrafts,
        scheduled: updatedScheduled,
        published: updatedPublished,
        failed: updatedFailed,
      };
    });
  },
  
  deletePost: (id) => {
    set(state => {
      const filteredPosts = state.posts.filter(post => post.id !== id);
      
      // Update categorized lists
      const filteredDrafts = filteredPosts.filter(post => post.status === 'draft');
      const filteredScheduled = filteredPosts.filter(post => post.status === 'scheduled');
      const filteredPublished = filteredPosts.filter(post => post.status === 'published');
      const filteredFailed = filteredPosts.filter(post => post.status === 'failed');
      
      return {
        posts: filteredPosts,
        drafts: filteredDrafts,
        scheduled: filteredScheduled,
        published: filteredPublished,
        failed: filteredFailed,
      };
    });
  },
  
  schedulePost: (id, scheduleDate) => {
    get().updatePost(id, { 
      scheduledFor: scheduleDate,
      status: 'scheduled',
    });
  },
  
  publishPost: (id, platformPostIds) => {
    get().updatePost(id, {
      publishedAt: new Date(),
      status: 'published',
      platformPostIds,
    });
  },
  
  markAsFailed: (id, error) => {
    get().updatePost(id, {
      status: 'failed',
    });
  },
  
  filterPosts: (status, platform, startDate, endDate) => {
    const { posts } = get();
    
    return posts.filter(post => {
      // Filter by status
      if (status && post.status !== status) {
        return false;
      }
      
      // Filter by platform
      if (platform && !post.platforms.includes(platform)) {
        return false;
      }
      
      // Filter by date range
      if (startDate && post.createdAt < startDate) {
        return false;
      }
      
      if (endDate && post.createdAt > endDate) {
        return false;
      }
      
      return true;
    });
  },
}));

export default usePostsStore;