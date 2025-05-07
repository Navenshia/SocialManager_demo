import React, { useState, useEffect, useCallback } from 'react';
import useCommentsStore from '../store/useCommentsStore';
import usePostsStore from '../store/usePostsStore';
import useSettingsStore from '../store/useSettingsStore';
import { Search, ThumbsUp, MessageCircle, Flag, Trash2, RefreshCw, Camera, Video, TrendingUp, Filter, Facebook } from 'lucide-react';
import { Platform, Comment } from '../types';
import { format } from 'date-fns';
import { apiFactory, socialMediaCoordinator } from '../api';

const CommentsPage: React.FC = () => {
  const { comments, addManyComments, markAsReplied, markAsSpam, deleteComment, clearAllComments } = useCommentsStore();
  const { posts } = usePostsStore();
  const { platformsEnabled, platformStats } = useSettingsStore();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideSpam, setHideSpam] = useState(true);
  const [showRepliedOnly, setShowRepliedOnly] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Define interfaces for API responses
  interface InstagramComment {
    id: string;
    text: string;
    timestamp: string;
    username: string;
    like_count: number;
  }

  interface InstagramCommentsResponse {
    data: InstagramComment[];
    paging?: {
      cursors: {
        before: string;
        after: string;
      };
      next?: string;
    };
  }

  // Extract comments from platform stats
  const extractCommentsFromStats = useCallback(() => {
    const extractedComments: Comment[] = [];

    // Process Instagram stats
    if (platformStats.instagram && platformStats.instagram.recentActivity) {
      console.log("Extracting comments from Instagram platform stats");

      // Filter for comment type activities
      const commentActivities = platformStats.instagram.recentActivity.filter(
        activity => activity.type === 'comment'
      );

      console.log(`Found ${commentActivities.length} comment activities in Instagram stats`);

      // Get published Instagram posts to try to match comments to posts
      // Filter out simulated posts (those with IDs starting with ig_post_)
      const instagramPosts = posts.filter(
        post => post.status === 'published' &&
        post.platformPostIds &&
        post.platforms.includes('instagram') &&
        post.platformPostIds.instagram &&
        !post.platformPostIds.instagram.startsWith('ig_post_')
      );

      // If no real posts exist, we won't extract comments from stats
      if (instagramPosts.length === 0) {
        console.log("No real Instagram posts found. Skipping comment extraction from stats.");
        return extractedComments;
      }

      // Use the first real post's ID if we can't match comments to specific posts
      const fallbackPostId = instagramPosts[0].platformPostIds?.instagram;

      // Convert to Comment objects
      // Note: This is a simplified conversion as platform stats don't contain all Comment fields
      // In a real app, you'd need to fetch the full comment data
      commentActivities.forEach((activity) => {
        // Try to find a matching post for this comment based on timestamp
        // This is a heuristic approach since we don't have direct post-comment relationships
        const matchingPost = instagramPosts.find(post => {
          // A comment should be newer than its post
          return new Date(post.createdAt) < activity.date;
        });

        const postId = matchingPost?.id || '';
        // Ensure we have a valid platformPostId (can't be undefined)
        const platformPostId = matchingPost?.platformPostIds?.instagram || fallbackPostId || '';

        // Create a more stable ID based on content and date to avoid duplicates
        const stableId = `instagram_comment_${activity.content.substring(0, 10).replace(/\s+/g, '_')}_${activity.date.getTime()}`;

        // Check if this comment already exists in the store (to prevent duplicates)
        const existingComment = comments.find(c =>
          c.id === stableId ||
          (c.content === activity.content && c.platform === 'instagram')
        );

        if (!existingComment && activity.content) {
          // Create a valid comment object with all required fields
          extractedComments.push({
            id: stableId,
            platform: 'instagram',
            postId: postId || '',
            platformPostId: platformPostId || '', // Use the matched post ID or fallback
            // For stats comments, we don't have a real platformCommentId
            // We'll mark them clearly so they're not used for replies
            platformCommentId: `stats_comment_${stableId}`,
            content: activity.content || '',
            author: {
              id: 'unknown',
              name: 'Instagram User',
              username: 'instagram_user',
              avatarUrl: undefined
            },
            likes: 0, // We don't have this info from stats
            createdAt: activity.date || new Date(),
            isHidden: false,
            isSpam: false,
            replied: false
          });
        }
      });
    }

    // TODO: Add similar blocks for YouTube and TikTok

    return extractedComments;
  }, [platformStats, posts, comments]);

  // Track if we're currently fetching comments to prevent duplicate calls
  const [isFetching, setIsFetching] = useState(false);

  // Fetch comments from all platforms
  const fetchAllComments = useCallback(async () => {
    // Check if we need to clear comments
    if (comments.length > 0 && posts.length === 0) {
      console.log("Posts were cleared but comments remain. Clearing comments to prevent orphaned comments.");
      clearAllComments();
    }

    // Prevent duplicate fetches
    if (isFetching) {
      console.log("Already fetching comments, skipping duplicate call");
      return;
    }

    try {
      setIsFetching(true);
      setIsLoading(true);
      setFetchError(null);

      // Get enabled platforms
      const enabledPlatforms = Object.entries(platformsEnabled)
        .filter(([_, enabled]) => enabled)
        .map(([platform]) => platform as Platform);

      console.log("Fetching comments from platforms:", enabledPlatforms);

      if (enabledPlatforms.length === 0) {
        setFetchError('No platforms are enabled. Please enable platforms in Settings.');
        setIsLoading(false);
        setIsFetching(false);
        return;
      }

      // First, fetch platform stats to ensure we have the latest data
      const updatedStats = await socialMediaCoordinator.getPlatformStats();
      console.log("Updated platform stats:", updatedStats);

      // Now fetch comments for each platform
      const allFetchedComments: Comment[] = [];

      // First, try to extract comments from platform stats
      const statsComments = extractCommentsFromStats();
      console.log(`Extracted ${statsComments.length} comments from platform stats`);

      // Always add stats comments - we'll deduplicate later
      allFetchedComments.push(...statsComments);
      console.log(`Added ${statsComments.length} stats comments to the fetch batch`);


      // Process Instagram comments from platformStats
      if (enabledPlatforms.includes('instagram') && platformStats.instagram) {
        try {
          console.log("Processing Instagram comments from platform stats");

          // Get published Instagram posts (excluding simulated posts)
          const instagramPosts = posts.filter(
            post => post.status === 'published' &&
            post.platformPostIds &&
            post.platforms.includes('instagram') &&
            post.platformPostIds.instagram &&
            !post.platformPostIds.instagram.startsWith('ig_post_')
          );

          console.log(`Found ${instagramPosts.length} published Instagram posts`);

          // Always fetch from API to get the latest comments
          if (instagramPosts.length > 0) {
            console.log("Fetching latest comments directly from Instagram API");

            // Import the specific service type to use its methods
            const InstagramApiService = (await import('../api/InstagramApiService')).default;
            const instagramApi = apiFactory.getApiService('instagram') as InstanceType<typeof InstagramApiService>;

            // Fetch comments for all posts
            for (const post of instagramPosts) {
              if (post.platformPostIds?.instagram) {
                try {
                  const postId = post.platformPostIds.instagram;
                  console.log(`Fetching comments for Instagram post ${postId}`);
                  const commentsResponse = await instagramApi.getComments(postId) as InstagramCommentsResponse;

                  // Process comments
                  if (commentsResponse && commentsResponse.data) {
                    console.log(`Retrieved ${commentsResponse.data.length} comments for post ${postId}`);

                    // Map API response to our Comment type
                    const postComments = commentsResponse.data.map((comment: InstagramComment) => {
                      // Ensure all required fields are present
                      if (!comment.id || !comment.text) {
                        console.warn('Skipping invalid comment:', comment);
                        return null;
                      }

                      return {
                        id: comment.id,
                        platform: 'instagram' as Platform,
                        postId: post.id,
                        platformPostId: postId,
                        platformCommentId: comment.id, // Store the original Instagram comment ID
                        content: comment.text || '',
                        author: {
                          id: comment.username || 'unknown',
                          name: comment.username || '',
                          username: comment.username || 'instagram_user',
                          avatarUrl: undefined
                        },
                        likes: comment.like_count || 0,
                        createdAt: new Date(comment.timestamp || Date.now()),
                        isHidden: false,
                        isSpam: false,
                        replied: false
                      };
                    }).filter(Boolean) as Comment[];

                    allFetchedComments.push(...postComments);
                  }
                } catch (error) {
                  console.error(`Error fetching comments for post ${post.id}:`, error);
                }
              }
            }
          } else {
            console.log("No Instagram posts found to fetch comments for");
          }
        } catch (error) {
          console.error('Error processing Instagram comments:', error);
        }
      }

      // TODO: Add similar blocks for YouTube and TikTok

      // Add all fetched comments to the store
      console.log(`Adding ${allFetchedComments.length} comments to the store`);
      if (allFetchedComments.length > 0) {
        // First, clear all existing comments to prevent duplicates
        console.log("Clearing existing comments to prevent duplicates");
        clearAllComments();

        // Create a Map to deduplicate comments within the fetched batch
        const uniqueComments = new Map<string, Comment>();

        // Process all fetched comments and keep only unique ones
        allFetchedComments.forEach(comment => {
          // Create a unique key based on content, platform, and platformPostId
          // This ensures we don't deduplicate across different platforms or posts
          const key = `${comment.platform}_${comment.platformPostId}_${comment.content}`;

          // Only add if we haven't seen this comment before
          if (!uniqueComments.has(key)) {
            uniqueComments.set(key, comment);
          } else {
            console.log(`Skipping duplicate comment: ${comment.platform} - ${comment.content.substring(0, 20)}...`);
          }
        });

        // Convert the Map values back to an array
        const newComments = Array.from(uniqueComments.values());

        console.log(`Found ${newComments.length} unique comments to add (filtered out ${allFetchedComments.length - newComments.length} duplicates)`);

        if (newComments.length > 0) {
          addManyComments(newComments);
        }
      } else {
        console.log("No comments found for any platform");
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setFetchError('Failed to fetch comments. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [posts, addManyComments, platformsEnabled, platformStats, comments, extractCommentsFromStats, isFetching, clearAllComments]);

  // Debug function to log the current state
  const logState = useCallback(() => {
    console.log("Current comments in store:", comments);
    console.log("Current posts:", posts);
    console.log("Enabled platforms:", platformsEnabled);
    console.log("Platform stats:", platformStats);

    // Extract and log comments from stats
    const statsComments = extractCommentsFromStats();
    console.log("Comments extracted from stats:", statsComments);
  }, [comments, posts, platformsEnabled, platformStats, extractCommentsFromStats]);

  // Function to import real Instagram posts into the posts store
  const importRealInstagramPosts = useCallback(async () => {
    try {
      // Get the Instagram API service
      const InstagramApiService = (await import('../api/InstagramApiService')).default;
      const instagramApi = apiFactory.getApiService('instagram') as InstanceType<typeof InstagramApiService>;

      // Fetch media from Instagram
      const mediaItems = await instagramApi.getMedia(5); // Limit to 5 posts to reduce duplicates
      console.log(`Fetched ${mediaItems.length} posts from Instagram`);

      if (mediaItems.length > 0) {
        // Get the posts store
        const postsStore = usePostsStore.getState();

        // Get existing Instagram post IDs to prevent duplicates
        const existingInstagramIds = new Set(
          posts
            .filter(post => post.platformPostIds?.instagram)
            .map(post => post.platformPostIds?.instagram)
        );

        console.log(`Found ${existingInstagramIds.size} existing Instagram posts in store`);

        // Count how many posts we'll import
        const newPosts = mediaItems.filter(media => !existingInstagramIds.has(media.id));
        console.log(`Found ${newPosts.length} new posts to import`);

        // If we already have all the posts, no need to import
        if (newPosts.length === 0) {
          console.log("All Instagram posts are already in the store, no need to import");
          return;
        }

        // Check if we have duplicate posts (more posts than we should have)
        const publishedPosts = posts.filter(p => p.status === 'published');
        console.log(`Found ${publishedPosts.length} published posts but only ${mediaItems.length} media items.`);

        // Always clear posts to fix the duplicate issue
        console.log(`Clearing all posts to fix duplicates`);

        // Delete all posts
        for (const post of [...posts]) {
          postsStore.deletePost(post.id);
        }

        console.log("Cleared all posts from store");

        // Reset existing IDs since we cleared the store
        existingInstagramIds.clear();

        // Import each new post
        let importCount = 0;
        for (const media of mediaItems) {
          // Skip if we already have this post
          if (existingInstagramIds.has(media.id)) {
            console.log(`Skipping existing post ${media.id}`);
            continue;
          }

          // Create a new post in the store
          const newPost = postsStore.createPost(
            media.caption || 'Instagram post',
            media.media_url,
            media.media_type?.toLowerCase() === 'video' ? 'video' : 'image',
            ['instagram']
          );

          // Mark it as published with the real Instagram post ID
          postsStore.publishPost(newPost.id, {
            instagram: media.id,
            youtube: '',
            tiktok: ''
          });

          console.log(`Imported Instagram post ${media.id} into posts store`);
          importCount++;
        }

        console.log(`Successfully imported ${importCount} new Instagram posts`);
      }
    } catch (error) {
      console.error("Error importing Instagram posts:", error);
    }
  }, [posts]);

  // Track if we've already imported posts to prevent duplicate imports
  const [postsImported, setPostsImported] = useState(false);

  // Check if Instagram platform is enabled and import posts
  useEffect(() => {
    console.log("Instagram platform enabled effect running. Posts imported:", postsImported);

    // Only run this effect once
    if (postsImported) {
      console.log("Posts already imported, skipping");
      return;
    }

    // For demo purposes, ensure Instagram is enabled
    if (!platformsEnabled.instagram) {
      console.log("Instagram platform is not enabled. Enabling it for demo purposes.");

      // In a real app, you would redirect to settings page instead
      // For demo, we'll simulate having Instagram enabled
      const settings = useSettingsStore.getState();
      settings.togglePlatform('instagram', true);

      // Set the real Instagram access token
      // This will override any existing token
      settings.setInstagramCredentials('IGAATjSFtfFLBBZAE0tYlJCSXZAEZAzl2M2RlR2V2YU1NSlBfSFZArMHRHMFFWd3pnSFVlUWxmeHhacUFPVVI3VHdocTJYaGY3d0xWSUUxREVyc2EzT0pLZATRJWHlhTUcwcm5aa2NOQlN3WldTWDA4aXRWX2c5RkpUeElYNi11V3l1awZDZD');
    }

    // Import posts
    console.log("Importing posts for the first time");
    importRealInstagramPosts();
    setPostsImported(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track if we've already fetched comments to prevent duplicate fetches
  const [commentsFetched, setCommentsFetched] = useState(false);

  // Fetch comments after posts are imported - but only once
  useEffect(() => {
    console.log("Comments fetch effect running. Comments fetched:", commentsFetched);

    // Only run this effect once when posts are available
    if (commentsFetched) {
      console.log(`Already fetched comments, skipping fetch`);
      return;
    }

    // Only fetch comments if we have posts
    if (posts.length > 0) {
      console.log(`Found ${posts.length} posts and comments not yet fetched, fetching comments...`);
      fetchAllComments();
      setCommentsFetched(true);

      // Log the state after fetching
      logState();
    } else {
      console.log("Waiting for posts to be imported before fetching comments...");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length]);

  const filteredComments = comments.filter(comment => {
    // Filter by platform
    if (selectedPlatform && comment.platform !== selectedPlatform) {
      return false;
    }

    // Filter by search query
    if (searchQuery && !comment.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filter out spam comments if requested
    if (hideSpam && comment.isSpam) {
      return false;
    }

    // Show only replied comments if requested
    if (showRepliedOnly && !comment.replied) {
      return false;
    }

    return true;
  });

  // Log the filtered comments for debugging
  useEffect(() => {
    console.log(`Filtered comments: ${filteredComments.length} of ${comments.length} total comments`);
    if (filteredComments.length === 0 && comments.length > 0) {
      console.log('No comments match the current filters. Try changing the filters or search query.');
    }
  }, [filteredComments.length, comments.length]);

  const handleReply = async (commentId: string) => {
    const reply = replyText[commentId];
    if (!reply || reply.trim() === '') return;

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      // Get the appropriate API service for the platform
      switch (comment.platform) {
        case 'instagram': {
          try {
            // Check if we have a valid platformPostId
            if (!comment.platformPostId) {
              console.error('Cannot reply to comment: missing platformPostId');
              alert('Cannot reply to this comment. The post ID is missing.');
              return;
            }

            // Log the comment details for debugging
            console.log('Replying to comment:', {
              commentId,
              platformPostId: comment.platformPostId,
              reply
            });

            // Import the specific service type to use its methods
            const InstagramApiService = (await import('../api/InstagramApiService')).default;
            const instagramApi = apiFactory.getApiService('instagram') as InstanceType<typeof InstagramApiService>;

            // Check if this is a simulated post or comment
            const isSimulatedComment = comment.id.includes('instagram_comment_');
            const isSimulatedPost = comment.platformPostId && comment.platformPostId.startsWith('ig_post_');

            if (isSimulatedComment || isSimulatedPost) {
              console.error('Cannot reply to simulated comments or posts');
              alert('This appears to be a demo comment. To reply to real Instagram comments, please connect your Instagram account and use real posts.');
              return;
            }

            // Log detailed information for debugging
            // Use the platformCommentId if available
            const platformCommentId = comment.platformCommentId || comment.id;

            console.log('Replying to real Instagram comment with:', {
              commentId: comment.id,
              platformCommentId,
              postId: comment.postId,
              platformPostId: comment.platformPostId,
              content: comment.content,
              reply: reply
            });

            try {
              // Only proceed with real posts and comments
              // Pass the comment ID as the third parameter to make it a threaded reply
              // Use the platformCommentId if available, otherwise fall back to the internal id
              const platformCommentId = comment.platformCommentId || comment.id;

              // Log the IDs we're using
              console.log(`Using platform comment ID: ${platformCommentId} for reply`);
              console.log(`Internal comment ID: ${comment.id}`);

              // Using the new /replies endpoint approach for threaded replies
              await instagramApi.replyToComment(comment.platformPostId, reply, platformCommentId);
              console.log(`Reply posted successfully as a threaded comment under comment ID: ${platformCommentId} using the /replies endpoint!`);
            } catch (error) {
              console.error('Error from Instagram API:', error);

              // Check if the error is related to the access token
              if (error instanceof Error &&
                  (error.message.includes('access_token') ||
                   error.message.includes('token') ||
                   error.message.includes('auth'))) {
                alert('Instagram authentication error. Your access token may be invalid or expired.');
              } else {
                // Re-throw the error to be caught by the outer catch block
                throw error;
              }
            }
          } catch (error) {
            console.error('Error replying to Instagram comment:', error);

            // Check if the error is related to platform not being enabled
            if (error instanceof Error && error.message.includes('not enabled')) {
              alert('Instagram platform is not enabled. Please enable it in Settings.');
            } else {
              alert('Error replying to comment: ' + (error instanceof Error ? error.message : 'Unknown error'));
            }
            return;
          }
          break;
        }
        case 'facebook': {
          try {
            console.log(`Replying to Facebook comment: ${comment.id}`);

            // Check if Facebook is enabled
            if (!platformsEnabled.facebook) {
              throw new Error('Facebook platform is not enabled');
            }

            // Import the specific service type to use its methods
            const FacebookApiService = (await import('../api/FacebookApiService')).default;
            const facebookApi = apiFactory.getApiService('facebook') as InstanceType<typeof FacebookApiService>;

            // Check if this is a simulated comment
            const isSimulatedComment = comment.id.includes('facebook_comment_');

            if (isSimulatedComment) {
              console.error('Cannot reply to simulated comments');
              alert('This appears to be a demo comment. To reply to real Facebook comments, please connect your Facebook account.');
              return;
            }

            // Get the platform comment ID (remove the fb_ prefix if present)
            const platformCommentId = comment.platformCommentId.startsWith('fb_')
              ? comment.platformCommentId.substring(3)
              : comment.platformCommentId;

            // Reply to the comment
            await facebookApi.replyToComment(comment.platformPostId, reply, platformCommentId);
            console.log(`Reply posted successfully to Facebook comment ID: ${platformCommentId}`);

            // Mark as replied in our store
            markAsReplied(comment.id);

            // Clear the reply text
            setReplyText({
              ...replyText,
              [comment.id]: ''
            });
          } catch (error) {
            console.error('Error replying to Facebook comment:', error);

            // Check if the error is related to platform not being enabled
            if (error instanceof Error && error.message.includes('not enabled')) {
              alert('Facebook platform is not enabled. Please enable it in Settings.');
            } else {
              alert('Error replying to comment: ' + (error instanceof Error ? error.message : 'Unknown error'));
            }
            return;
          }
          break;
        }
        // TODO: Add cases for YouTube and TikTok
        default:
          console.warn(`Replying to comments on ${comment.platform} is not yet supported.`);
          alert(`Replying to comments on ${comment.platform} is not yet supported.`);
          return;
      }

      // Mark as replied in our local state
      markAsReplied(commentId);

      // Clear the reply text
      setReplyText(prev => {
        const newState = { ...prev };
        delete newState[commentId];
        return newState;
      });

      // Show success message
      alert('Reply posted successfully as a threaded comment using the /replies endpoint!');
    } catch (error) {
      console.error('Error replying to comment:', error);
      alert('Failed to post reply. Please try again.');
    }
  };

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'instagram':
        return <Camera size={16} className="text-pink-600" />;
      case 'facebook':
        return <Facebook size={16} className="text-blue-600" />;
      case 'youtube':
        return <Video size={16} className="text-red-600" />;
      case 'tiktok':
        return <TrendingUp size={16} className="text-black dark:text-white" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comments Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track and respond to comments across all your platforms</p>
        </div>
        <div className="flex items-center space-x-2">
          {isLoading ? (
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading comments...
            </div>
          ) : (
            <>
              <button
                onClick={() => fetchAllComments()}
                disabled={isLoading || isFetching}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  isLoading || isFetching
                    ? 'bg-blue-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <RefreshCw size={16} className={`mr-2 ${isLoading || isFetching ? 'animate-spin' : ''}`} />
                {isLoading || isFetching ? 'Refreshing...' : 'Refresh Comments'}
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all comments? This action cannot be undone.')) {
                    clearAllComments();
                  }
                }}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 size={16} className="mr-2" />
                Clear Comments
              </button>

              <button
                onClick={() => {
                  // Deduplicate comments
                  console.log("Manually deduplicating comments");

                  // Create a Map to store unique comments
                  const uniqueComments = new Map<string, Comment>();

                  // Process all comments and keep only unique ones
                  comments.forEach(comment => {
                    // Create a unique key based on content, platform, and platformPostId
                    // This ensures we don't deduplicate across different platforms or posts
                    const key = `${comment.platform}_${comment.platformPostId}_${comment.content}`;

                    // Only add if we haven't seen this comment before
                    if (!uniqueComments.has(key)) {
                      uniqueComments.set(key, comment);
                    } else {
                      console.log(`Skipping duplicate comment: ${comment.platform} - ${comment.content.substring(0, 20)}...`);
                    }
                  });

                  // Convert the Map values back to an array
                  const uniqueCommentsArray = Array.from(uniqueComments.values());

                  // Clear all comments and add only the unique ones
                  clearAllComments();
                  addManyComments(uniqueCommentsArray);

                  alert(`Deduplication complete. Kept ${uniqueCommentsArray.length} unique comments out of ${comments.length} total.`);
                }}
                className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors mr-2"
              >
                <Filter size={16} className="mr-2" />
                Deduplicate Comments
              </button>

              <button
                onClick={() => {
                  if (window.confirm('This will reset all posts and comments and reimport them from Instagram. Continue?')) {
                    // Clear all posts
                    const postsStore = usePostsStore.getState();
                    for (const post of [...posts]) {
                      postsStore.deletePost(post.id);
                    }

                    // Clear all comments
                    clearAllComments();

                    // Reset state flags
                    setPostsImported(false);
                    setCommentsFetched(false);

                    // Force a page refresh to ensure clean state
                    window.location.reload();
                  }
                }}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mr-2"
              >
                <RefreshCw size={16} className="mr-2" />
                Reset All
              </button>

              <button
                onClick={() => {
                  if (window.confirm('This will reset all settings including your Instagram credentials. Continue?')) {
                    // Clear settings
                    const settings = useSettingsStore.getState();
                    settings.resetStore();

                    // Set the new access token
                    settings.togglePlatform('instagram', true);
                    settings.setInstagramCredentials('IGAATjSFtfFLBBZAE0tYlJCSXZAEZAzl2M2RlR2V2YU1NSlBfSFZArMHRHMFFWd3pnSFVlUWxmeHhacUFPVVI3VHdocTJYaGY3d0xWSUUxREVyc2EzT0pLZATRJWHlhTUcwcm5aa2NOQlN3WldTWDA4aXRWX2c5RkpUeElYNi11V3l1awZDZD');

                    // Force a page refresh to ensure clean state
                    window.location.reload();
                  }
                }}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw size={16} className="mr-2" />
                Reset Credentials
              </button>
            </>
          )}
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 flex justify-between items-center">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{fetchError}</p>
            </div>
          </div>
          <button
            onClick={() => fetchAllComments()}
            disabled={isLoading || isFetching}
            className={`${
              isLoading || isFetching
                ? 'text-red-400 cursor-not-allowed'
                : 'text-red-700 hover:text-red-900'
            }`}
          >
            {isLoading || isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search comments..."
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Platform Filter */}
          <div className="flex space-x-2">
            <button
              className={`p-2 rounded-lg ${selectedPlatform === null ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}
              onClick={() => setSelectedPlatform(null)}
            >
              All
            </button>
            <button
              className={`p-2 rounded-lg flex items-center space-x-1 ${selectedPlatform === 'instagram' ? 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}
              onClick={() => setSelectedPlatform('instagram')}
            >
              <Camera size={16} />
              <span>Instagram</span>
            </button>
            <button
              className={`p-2 rounded-lg flex items-center space-x-1 ${selectedPlatform === 'facebook' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}
              onClick={() => setSelectedPlatform('facebook')}
            >
              <Facebook size={16} />
              <span>Facebook</span>
            </button>
            <button
              className={`p-2 rounded-lg flex items-center space-x-1 ${selectedPlatform === 'youtube' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}
              onClick={() => setSelectedPlatform('youtube')}
            >
              <Video size={16} />
              <span>YouTube</span>
            </button>
            <button
              className={`p-2 rounded-lg flex items-center space-x-1 ${selectedPlatform === 'tiktok' ? 'bg-gray-900 text-white dark:bg-gray-600 dark:text-gray-100' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}
              onClick={() => setSelectedPlatform('tiktok')}
            >
              <TrendingUp size={16} />
              <span>TikTok</span>
            </button>
          </div>

          {/* Additional Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                id="hideSpam"
                type="checkbox"
                className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                checked={hideSpam}
                onChange={() => setHideSpam(!hideSpam)}
              />
              <label htmlFor="hideSpam" className="ml-2 text-sm text-gray-700 dark:text-gray-200">
                Hide Spam
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="repliedOnly"
                type="checkbox"
                className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                checked={showRepliedOnly}
                onChange={() => setShowRepliedOnly(!showRepliedOnly)}
              />
              <label htmlFor="repliedOnly" className="ml-2 text-sm text-gray-700 dark:text-gray-200">
                Replied Only
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {filteredComments.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No comments found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {isLoading ? 'Loading comments...' :
               comments.length > 0 ? 'No comments match your current filters or search criteria.' :
               'No comments found. Try refreshing or check your Instagram account.'}
            </p>
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400">
                Total comments in store: {comments.length}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Filtered comments: {filteredComments.length}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Published posts: {platformStats.instagram?.totalPosts || 0}
              </p>
            </div>
            {!isLoading && (
              <button
                onClick={() => {
                  // Clear any filters first
                  setSelectedPlatform(null);
                  setSearchQuery('');
                  setHideSpam(false);
                  setShowRepliedOnly(false);

                  // Then fetch comments
                  fetchAllComments();
                }}
                disabled={isLoading || isFetching}
                className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                  isLoading || isFetching
                    ? 'bg-blue-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <RefreshCw size={16} className={`mr-2 ${isLoading || isFetching ? 'animate-spin' : ''}`} />
                {isLoading || isFetching ? 'Refreshing...' : 'Refresh & Reset Filters'}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredComments.map(comment => (
              <div key={comment.id} className={`p-6 ${comment.isSpam ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                <div className="flex items-start mb-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                    {comment.author.avatarUrl ? (
                      <img src={comment.author.avatarUrl} alt={comment.author.name || comment.author.username || 'User avatar'} className="h-10 w-10 rounded-full" />
                    ) : (
                      <span className="text-lg font-semibold">{(comment.author.name || comment.author.username || 'User').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {comment.author.name || comment.author.username || 'Instagram User'}
                      </h4>
                      <div className="ml-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        {getPlatformIcon(comment.platform)}
                        <span className="ml-1">{comment.platform}</span>
                      </div>
                      <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {comment.createdAt ? format(new Date(comment.createdAt), 'MMM d, yyyy') : 'Unknown date'}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-800 dark:text-gray-200">{comment.content}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-13 pl-13">
                  <div className="flex items-center space-x-4 mb-3">
                    <button className="text-gray-500 hover:text-blue-600 flex items-center space-x-1 transition-colors">
                      <ThumbsUp size={16} />
                      <span>Like</span>
                    </button>
                    <button
                      onClick={() => markAsSpam(comment.id)}
                      className={`flex items-center space-x-1 ${comment.isSpam ? 'text-red-600' : 'text-gray-500 hover:text-red-600'} transition-colors`}
                    >
                      <Flag size={16} />
                      <span>{comment.isSpam ? 'Marked as Spam' : 'Mark as Spam'}</span>
                    </button>
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="text-gray-500 hover:text-red-600 flex items-center space-x-1 transition-colors"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>

                  {/* Reply Area */}
                  {!comment.replied ? (
                    <div className="mt-4">
                      <div className="flex flex-col">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span className="font-medium">Note:</span> Your reply will be posted as a threaded reply directly under this comment on {comment.platform === 'facebook' ? 'Facebook' : 'Instagram'} using the comment's /replies endpoint.
                        </div>
                        <div className="flex">
                          <input
                            type="text"
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-l-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Write a reply..."
                            value={replyText[comment.id] || ''}
                            onChange={(e) => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                          />
                          <button
                            className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition-colors"
                            onClick={() => handleReply(comment.id)}
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center">
                      <MessageCircle size={14} className="mr-1" />
                      Replied as threaded comment on {comment.platform === 'facebook' ? 'Facebook' : 'Instagram'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsPage;
