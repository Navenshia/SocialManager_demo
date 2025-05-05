import React, { useState } from 'react';
import usePostsStore from '../store/usePostsStore';
import { Calendar, Clock, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Post, Platform } from '../types';

const PlatformIcon: React.FC<{ platform: Platform }> = ({ platform }) => {
  return (
    <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${
      platform === 'instagram' ? 'bg-pink-100 text-pink-600' :
      platform === 'youtube' ? 'bg-red-100 text-red-600' : 
      'bg-gray-100 text-gray-600'
    }`}>
      {platform.charAt(0).toUpperCase()}
    </span>
  );
};

const SchedulerPage: React.FC = () => {
  const { scheduled, deletePost } = usePostsStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Filter posts by selected date if applicable
  const filteredPosts = selectedDate 
    ? scheduled.filter(post => {
        if (!post.scheduledFor) return false;
        const postDate = new Date(post.scheduledFor);
        return postDate.toDateString() === selectedDate.toDateString();
      })
    : scheduled;

  // Group posts by date
  const postsByDate = filteredPosts.reduce((acc, post) => {
    if (!post.scheduledFor) return acc;
    
    const dateStr = new Date(post.scheduledFor).toDateString();
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(post);
    return acc;
  }, {} as Record<string, Post[]>);

  // Sort dates
  const sortedDates = Object.keys(postsByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Scheduler</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Schedule and manage your upcoming posts</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => setSelectedDate(null)}
          >
            View All Scheduled
          </button>
        </div>
      </div>

      {/* Calendar Widget */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Calendar className="mr-2" size={18} />
          Filter by Date
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
            
            return (
              <button
                key={i}
                className={`p-3 rounded-lg border text-center ${
                  isSelected 
                    ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-100' 
                    : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
                onClick={() => setSelectedDate(date)}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400">{format(date, 'EEE')}</div>
                <div className="text-xl font-semibold my-1">{format(date, 'd')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{format(date, 'MMM')}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scheduled Posts */}
      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No scheduled posts</h3>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have any posts scheduled{selectedDate ? ' for this date' : ''}. Create a post and schedule it to see it here.
            </p>
          </div>
        ) : (
          sortedDates.map(dateStr => (
            <div key={dateStr} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {format(new Date(dateStr), 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {postsByDate[dateStr].map(post => (
                  <div key={post.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <Clock size={16} className="text-gray-500 mr-2" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {post.scheduledFor ? format(new Date(post.scheduledFor), 'h:mm a') : 'No time set'}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button className="p-1 text-gray-500 hover:text-blue-600 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                          onClick={() => deletePost(post.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-gray-800 dark:text-gray-200 mb-4">
                      {post.content}
                    </div>
                    
                    {post.mediaUrl && (
                      <div className="mb-4">
                        <div className="w-full h-48 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden">
                          <img 
                            src={post.mediaUrl} 
                            alt="Post media" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-2 mt-2">
                      {post.platforms.map(platform => (
                        <PlatformIcon key={platform} platform={platform} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SchedulerPage; 