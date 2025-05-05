import React, { useState, useEffect, useCallback } from 'react';
import useCommentsStore from '../store/useCommentsStore';
import usePostsStore from '../store/usePostsStore';
import { Search, Filter, Instagram, Youtube, TrendingUp, ThumbsUp, MessageCircle, Flag, Trash2, RefreshCw } from 'lucide-react';
import { Platform, Comment } from '../types';
import { format } from 'date-fns';
import InstagramApiService from '../api/InstagramApiService';

const CommentsPage: React.FC = () => {
  const { comments, addManyComments, updateComment, markAsReplied, hideComment, markAsSpam, deleteComment } = useCommentsStore();
  const { posts } = usePostsStore();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideSpam, setHideSpam] = useState(true);
  const [showRepliedOnly, setShowRepliedOnly] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch comments from Instagram posts 
  const fetchInstagramComments = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      
      // Get Instagram API service
      const instagramApi = new InstagramApiService();
      
      // Get published Instagram posts
      const instagramPosts = posts.filter(
        post => post.status === 'published' && 
        post.platformPostIds && 
        post.platforms.includes('instagram')
      );
      
      // Fetch comments for each post
      const allFetchedComments: Comment[] = [];
      
      for (const post of instagramPosts) {
        if (post.platformPostIds?.instagram) {
          try {
            const postId = post.platformPostIds.instagram;
            const commentsResponse = await instagramApi.getComments(postId);
            
            if (commentsResponse && commentsResponse.data) {
              // Map API response to our Comment type
              const postComments = commentsResponse.data.map(comment => ({
                id: comment.id,
                platform: 'instagram' as Platform,
                postId: post.id,
                platformPostId: postId,
                content: comment.text,
                author: {
                  id: comment.username, // Using username as ID
                  name: comment.username,
                  username: comment.username,
                  avatarUrl: undefined // Instagram API doesn't provide avatar in comments
                },
                likes: comment.like_count,
                createdAt: new Date(comment.timestamp),
                isHidden: false,
                isSpam: false,
                replied: false
              }));
              
              allFetchedComments.push(...postComments);
            }
          } catch (error) {
            console.error(`Error fetching comments for post ${post.id}:`, error);
          }
        }
      }
      
      // Add fetched comments to the store
      if (allFetchedComments.length > 0) {
        addManyComments(allFetchedComments);
      }
    } catch (error) {
      console.error('Error fetching Instagram comments:', error);
      setFetchError('Failed to fetch comments. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [posts, addManyComments]);
  
  // Fetch comments on component mount
  useEffect(() => {
    fetchInstagramComments();
  }, [fetchInstagramComments]);

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

  const handleReply = async (commentId: string) => {
    const reply = replyText[commentId];
    if (!reply || reply.trim() === '') return;
    
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      // In a real app, this would call an API to post the reply
      if (comment.platform === 'instagram') {
        const instagramApi = new InstagramApiService();
        await instagramApi.replyToComment(comment.platformPostId, reply);
      }
      
      // Mark as replied in our local state
      markAsReplied(commentId);
      
      // Clear the reply text
      setReplyText(prev => {
        const newState = { ...prev };
        delete newState[commentId];
        return newState;
      });
    } catch (error) {
      console.error('Error replying to comment:', error);
      alert('Failed to post reply. Please try again.');
    }
  };

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'instagram':
        return <Instagram size={16} className="text-pink-600" />;
      case 'youtube':
        return <Youtube size={16} className="text-red-600" />;
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
        <div className="flex items-center">
          {isLoading ? (
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading comments...
            </div>
          ) : (
            <button 
              onClick={() => fetchInstagramComments()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh Comments
            </button>
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
            onClick={() => fetchInstagramComments()}
            className="text-red-700 hover:text-red-900"
          >
            Retry
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
              <Instagram size={16} />
              <span>Instagram</span>
            </button>
            <button
              className={`p-2 rounded-lg flex items-center space-x-1 ${selectedPlatform === 'youtube' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}
              onClick={() => setSelectedPlatform('youtube')}
            >
              <Youtube size={16} />
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
              {isLoading ? 'Loading comments...' : 'No comments match your current filters or search criteria.'}
            </p>
            {!isLoading && posts.filter(p => p.status === 'published').length > 0 && (
              <button
                onClick={() => fetchInstagramComments()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={16} className="mr-2" />
                Refresh Comments
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
                      <img src={comment.author.avatarUrl} alt={comment.author.name} className="h-10 w-10 rounded-full" />
                    ) : (
                      <span className="text-lg font-semibold">{comment.author.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {comment.author.name}
                      </h4>
                      <div className="ml-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        {getPlatformIcon(comment.platform)}
                        <span className="ml-1">{comment.platform}</span>
                      </div>
                      <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(comment.createdAt), 'MMM d, yyyy')}
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
                  ) : (
                    <div className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center">
                      <MessageCircle size={14} className="mr-1" />
                      Replied
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