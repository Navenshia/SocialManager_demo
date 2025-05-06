import { create } from 'zustand';
import { Comment, Platform } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface CommentsState {
  comments: Comment[];

  // Actions
  addComment: (comment: Omit<Comment, 'id' | 'createdAt'>) => Comment;
  addManyComments: (comments: Omit<Comment, 'id' | 'createdAt'>[]) => Comment[];
  updateComment: (id: string, data: Partial<Comment>) => void;
  deleteComment: (id: string) => void;
  markAsReplied: (id: string) => void;
  hideComment: (id: string) => void;
  markAsSpam: (id: string) => void;
  clearAllComments: () => void;
  filterComments: (
    platform?: Platform,
    postId?: string,
    keyword?: string,
    hideSpam?: boolean,
    showRepliedOnly?: boolean
  ) => Comment[];
}

const useCommentsStore = create<CommentsState>((set, get) => ({
  comments: [],

  addComment: (commentData) => {
    const newComment: Comment = {
      ...commentData,
      id: uuidv4(),
      createdAt: new Date(),
    };

    set(state => ({
      comments: [...state.comments, newComment]
    }));

    return newComment;
  },

  addManyComments: (commentsData) => {
    const newComments = commentsData.map(commentData => ({
      ...commentData,
      id: uuidv4(),
      createdAt: new Date(),
    }));

    set(state => ({
      comments: [...state.comments, ...newComments]
    }));

    return newComments;
  },

  updateComment: (id, data) => {
    set(state => ({
      comments: state.comments.map(comment =>
        comment.id === id ? { ...comment, ...data } : comment
      )
    }));
  },

  deleteComment: (id) => {
    set(state => ({
      comments: state.comments.filter(comment => comment.id !== id)
    }));
  },

  markAsReplied: (id) => {
    get().updateComment(id, { replied: true });
  },

  hideComment: (id) => {
    get().updateComment(id, { isHidden: true });
  },

  markAsSpam: (id) => {
    get().updateComment(id, { isSpam: true });
  },

  clearAllComments: () => {
    set({ comments: [] });
  },

  filterComments: (platform, postId, keyword, hideSpam = true, showRepliedOnly = false) => {
    const { comments } = get();

    return comments.filter(comment => {
      // Filter by platform
      if (platform && comment.platform !== platform) {
        return false;
      }

      // Filter by post ID
      if (postId && comment.postId !== postId) {
        return false;
      }

      // Filter by keyword in content
      if (keyword && !comment.content.toLowerCase().includes(keyword.toLowerCase())) {
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
  },
}));

export default useCommentsStore;