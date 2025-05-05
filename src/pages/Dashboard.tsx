import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Calendar, Plus, RefreshCw } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import usePostsStore from '../store/usePostsStore';
import useSettingsStore from '../store/useSettingsStore';
import { Platform, PlatformStats, Post } from '../types';
import { socialMediaCoordinator } from '../api';
import { format } from 'date-fns';

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'scheduled' | 'recent'>('overview');
  
  const { posts, drafts, scheduled, published } = usePostsStore();
  const { platformsEnabled, platformStats } = useSettingsStore();
  
  const fetchStats = async () => {
    setIsLoading(true);
    try {
      await socialMediaCoordinator.getPlatformStats();
    } catch (error) {
      console.error('Error fetching platform stats:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Fetch stats on initial load
    fetchStats();
  }, []);
  
  // Get platforms that are enabled
  const enabledPlatforms = Object.entries(platformsEnabled)
    .filter(([_, enabled]) => enabled)
    .map(([platform]) => platform as Platform);
  
  // Get next scheduled post
  const nextScheduledPost = scheduled.length > 0
    ? [...scheduled].sort((a, b) => 
        a.scheduledFor && b.scheduledFor 
          ? new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
          : 0
      )[0]
    : null;
  
  // Get recent activity
  const recentPosts = [...posts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
            onClick={fetchStats}
            disabled={isLoading}
          >
            Refresh
          </Button>
          
          <Button 
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => {}}
          >
            <Link to="/create">New Post</Link>
          </Button>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400 mr-4">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {posts.length}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Posts</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-800/50 text-green-600 dark:text-green-400 mr-4">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {scheduled.length}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">IG</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {platformStats.instagram?.totalPosts || 0}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Instagram Posts</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-4">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">YT</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {platformStats.youtube?.totalPosts || 0}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">YouTube Videos</p>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform activity */}
        <div className="lg:col-span-2">
          <Card 
            title="Platform Activity" 
            className="h-full flex flex-col"
          >
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              <button
                className={`pb-2 px-4 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`pb-2 px-4 text-sm font-medium ${
                  activeTab === 'scheduled'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                onClick={() => setActiveTab('scheduled')}
              >
                Scheduled
              </button>
              <button
                className={`pb-2 px-4 text-sm font-medium ${
                  activeTab === 'recent'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                onClick={() => setActiveTab('recent')}
              >
                Recent Posts
              </button>
            </div>
            
            {/* Tab content */}
            {activeTab === 'overview' && (
              <div>
                {enabledPlatforms.length > 0 ? (
                  <div className="space-y-4">
                    {enabledPlatforms.map((platform) => {
                      const stats = platformStats[platform];
                      return (
                        <div key={platform} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium capitalize">{platform}</h4>
                            <span className="text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded">
                              Active
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                            <div>
                              <span className="block text-gray-500 dark:text-gray-400">Posts</span>
                              <span className="font-semibold">{stats?.totalPosts || 0}</span>
                            </div>
                            <div>
                              <span className="block text-gray-500 dark:text-gray-400">Comments</span>
                              <span className="font-semibold">{stats?.totalComments || 0}</span>
                            </div>
                            <div>
                              <span className="block text-gray-500 dark:text-gray-400">Engagement</span>
                              <span className="font-semibold">{stats?.engagementRate ? `${(stats.engagementRate * 100).toFixed(1)}%` : '0%'}</span>
                            </div>
                          </div>
                          
                          {stats?.recentActivity && stats.recentActivity.length > 0 && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Latest: {stats.recentActivity[0].content.substring(0, 30)}{stats.recentActivity[0].content.length > 30 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No platforms connected</p>
                    <Button size="sm" onClick={() => {}}>
                      <Link to="/settings">Connect Platforms</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'scheduled' && (
              <div>
                {scheduled.length > 0 ? (
                  <div className="space-y-4">
                    {scheduled.map((post) => (
                      <div key={post.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium line-clamp-1">{post.content.substring(0, 50)}{post.content.length > 50 ? '...' : ''}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {post.scheduledFor && format(new Date(post.scheduledFor), 'PPp')}
                            </p>
                          </div>
                          <div className="flex">
                            {post.platforms.map((platform) => (
                              <div
                                key={platform}
                                className="w-6 h-6 rounded-full flex items-center justify-center ml-1"
                                title={platform}
                              >
                                {platform === 'instagram' && (
                                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500"></div>
                                )}
                                {platform === 'youtube' && (
                                  <div className="w-full h-full rounded-full bg-red-600"></div>
                                )}
                                {platform === 'tiktok' && (
                                  <div className="w-full h-full rounded-full bg-black"></div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No scheduled posts</p>
                    <Button size="sm" onClick={() => {}}>
                      <Link to="/create">Create Post</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'recent' && (
              <div>
                {recentPosts.length > 0 ? (
                  <div className="space-y-4">
                    {recentPosts.map((post) => (
                      <div key={post.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium line-clamp-1">{post.content.substring(0, 50)}{post.content.length > 50 ? '...' : ''}</h4>
                            <div className="flex items-center text-sm">
                              <span className={`
                                px-2 py-0.5 rounded-full text-xs
                                ${post.status === 'published' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : ''}
                                ${post.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' : ''}
                                ${post.status === 'draft' ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400' : ''}
                                ${post.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' : ''}
                              `}>
                                {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                              </span>
                              <span className="mx-2 text-gray-400">•</span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {format(new Date(post.updatedAt), 'PP')}
                              </span>
                            </div>
                          </div>
                          <div className="flex">
                            {post.platforms.map((platform) => (
                              <div
                                key={platform}
                                className="w-6 h-6 rounded-full flex items-center justify-center ml-1"
                                title={platform}
                              >
                                {platform === 'instagram' && (
                                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500"></div>
                                )}
                                {platform === 'youtube' && (
                                  <div className="w-full h-full rounded-full bg-red-600"></div>
                                )}
                                {platform === 'tiktok' && (
                                  <div className="w-full h-full rounded-full bg-black"></div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No posts yet</p>
                    <Button size="sm" onClick={() => {}}>
                      <Link to="/create">Create Post</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
        
        {/* Next scheduled & drafts */}
        <div className="space-y-6">
          <Card title="Next Scheduled Post">
            {nextScheduledPost ? (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Scheduled for {nextScheduledPost.scheduledFor && format(new Date(nextScheduledPost.scheduledFor), 'PPp')}
                </p>
                <div className="border-l-4 border-blue-500 pl-3 py-1">
                  <p className="line-clamp-2">{nextScheduledPost.content}</p>
                </div>
                <div className="mt-3 flex">
                  {nextScheduledPost.platforms.map((platform) => (
                    <div
                      key={platform}
                      className="mr-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded-full"
                    >
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Link 
                    to="/scheduler" 
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View all scheduled posts
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 mb-3">No upcoming scheduled posts</p>
                <Button size="sm" variant="outline">
                  <Link to="/create">Schedule a Post</Link>
                </Button>
              </div>
            )}
          </Card>
          
          <Card title="Drafts">
            {drafts.length > 0 ? (
              <div className="space-y-3">
                {drafts.slice(0, 3).map((draft) => (
                  <div 
                    key={draft.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <p className="line-clamp-2 text-sm">{draft.content}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Last updated: {format(new Date(draft.updatedAt), 'PP')}
                    </p>
                  </div>
                ))}
                {drafts.length > 3 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    +{drafts.length - 3} more draft{drafts.length - 3 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 py-4 text-center">No drafts</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;