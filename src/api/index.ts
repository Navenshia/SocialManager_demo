import InstagramApiService from './InstagramApiService';
import YouTubeApiService from './YouTubeApiService';
import TikTokApiService from './TikTokApiService';
import FacebookApiService from './FacebookApiService';
import useSettingsStore from '../store/useSettingsStore';
import { Platform, Post } from '../types';

/**
 * API factory that provides platform-specific API services
 */
class SocialMediaApiFactory {
  private instagramApi: InstagramApiService | null = null;
  private youtubeApi: YouTubeApiService | null = null;
  private tiktokApi: TikTokApiService | null = null;
  private facebookApi: FacebookApiService | null = null;

  /**
   * Get API service for a specific platform
   */
  getApiService(platform: Platform) {
    const settings = useSettingsStore.getState();
    const isEnabled = settings.platformsEnabled[platform];

    if (!isEnabled) {
      throw new Error(`Platform ${platform} is not enabled`);
    }

    switch (platform) {
      case 'instagram':
        if (!this.instagramApi) {
          try {
            this.instagramApi = new InstagramApiService();
          } catch (error) {
            console.error('Failed to initialize Instagram API', error);
            throw new Error('Instagram API is not properly configured');
          }
        }
        return this.instagramApi;

      case 'youtube':
        if (!this.youtubeApi) {
          try {
            this.youtubeApi = new YouTubeApiService();
          } catch (error) {
            console.error('Failed to initialize YouTube API', error);
            throw new Error('YouTube API is not properly configured');
          }
        }
        return this.youtubeApi;

      case 'tiktok':
        if (!this.tiktokApi) {
          try {
            this.tiktokApi = new TikTokApiService();
          } catch (error) {
            console.error('Failed to initialize TikTok API', error);
            throw new Error('TikTok API is not properly configured');
          }
        }
        return this.tiktokApi;

      case 'facebook':
        if (!this.facebookApi) {
          try {
            this.facebookApi = new FacebookApiService();
          } catch (error) {
            console.error('Failed to initialize Facebook API', error);
            throw new Error('Facebook API is not properly configured');
          }
        }
        return this.facebookApi;

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Reset API services (e.g. after credentials change)
   */
  resetApiService(platform: Platform) {
    switch (platform) {
      case 'instagram':
        this.instagramApi = null;
        break;
      case 'youtube':
        this.youtubeApi = null;
        break;
      case 'tiktok':
        this.tiktokApi = null;
        break;
      case 'facebook':
        this.facebookApi = null;
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}

export const apiFactory = new SocialMediaApiFactory();

/**
 * Service to coordinate cross-platform posting
 */
export class SocialMediaCoordinator {
  /**
   * Post content to multiple platforms
   */
  async publishToMultiplePlatforms(
    post: Post
  ): Promise<Record<Platform, string | null>> {
    const results: Record<Platform, string | null> = {
      instagram: null,
      youtube: null,
      tiktok: null,
      facebook: null,
    };

    console.log("Publishing to platforms:", post.platforms);

    try {
      // Process each platform sequentially to better catch and handle errors
      for (const platform of post.platforms) {
        try {
          console.log(`Attempting to publish to ${platform}...`);

          switch (platform) {
            case 'instagram':
              if (post.mediaUrl && post.mediaType) {
                const instagramApi = apiFactory.getApiService('instagram') as InstagramApiService;
                results[platform] = await instagramApi.createPost(post.content, post.mediaUrl, post.mediaType);
                console.log(`Successfully published to Instagram with ID: ${results[platform]}`);
              } else {
                console.error("Instagram post requires media");
                results[platform] = null;
              }
              break;

            case 'youtube':
              if (post.mediaUrl && post.mediaType === 'video') {
                const youtubeApi = apiFactory.getApiService('youtube') as YouTubeApiService;
                results[platform] = await youtubeApi.createPost(post.content.substring(0, 100), post.content, post.mediaUrl);
                console.log(`Successfully published to YouTube with ID: ${results[platform]}`);
              } else {
                console.error("YouTube post requires video media");
                results[platform] = null;
              }
              break;

            case 'tiktok':
              if (post.mediaUrl && post.mediaType === 'video') {
                const tiktokApi = apiFactory.getApiService('tiktok') as TikTokApiService;
                results[platform] = await tiktokApi.createPost(post.content, post.mediaUrl);
                console.log(`Successfully published to TikTok with ID: ${results[platform]}`);
              } else {
                console.error("TikTok post requires video media");
                results[platform] = null;
              }
              break;

            case 'facebook':
              try {
                const facebookApi = apiFactory.getApiService('facebook') as FacebookApiService;

                // If we have the original file, pass it to Facebook for direct upload
                if (post.mediaFile && post.mediaType === 'image') {
                  console.log("Using original file for Facebook upload:", post.mediaFile.name);
                  results[platform] = await facebookApi.createPostWithFile(post.content, post.mediaFile);
                } else {
                  // Otherwise use the URL
                  results[platform] = await facebookApi.createPost(post.content, post.mediaUrl, post.mediaType);
                }

                console.log(`Successfully published to Facebook with ID: ${results[platform]}`);
              } catch (error) {
                console.error("Error publishing to Facebook:", error);
                results[platform] = null;
              }
              break;
          }
        } catch (error) {
          console.error(`Error publishing to ${platform}:`, error);
          results[platform] = null;
        }
      }
    } catch (error) {
      console.error("Error in publishToMultiplePlatforms:", error);
    }

    console.log("Publishing results:", results);
    return results;
  }

  /**
   * Fetch comments from all enabled platforms
   */
  async fetchAllPlatformComments() {
    const settings = useSettingsStore.getState();
    const enabledPlatforms = Object.entries(settings.platformsEnabled)
      .filter(([_, enabled]) => enabled)
      .map(([platform]) => platform as Platform);

    // Implementation would depend on how posts are stored and tracked
    // This is a placeholder for the actual implementation
    console.log('Fetching comments from platforms:', enabledPlatforms);
  }

  /**
   * Get statistics from all enabled platforms
   */
  async getPlatformStats() {
    const settings = useSettingsStore.getState();
    const enabledPlatforms = Object.entries(settings.platformsEnabled)
      .filter(([_, enabled]) => enabled)
      .map(([platform]) => platform as Platform);

    const results = {};

    for (const platform of enabledPlatforms) {
      try {
        const api = apiFactory.getApiService(platform);
        const stats = await api.getAccountStats();
        if (stats) {
          settings.updatePlatformStats(platform, stats);
        }
      } catch (error) {
        console.error(`Error getting stats for ${platform}:`, error);
      }
    }

    return settings.platformStats;
  }
}

export const socialMediaCoordinator = new SocialMediaCoordinator();