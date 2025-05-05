import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreatePostForm from '../components/forms/CreatePostForm';
import Card from '../components/ui/Card';

const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  
  const handleSuccess = () => {
    // Redirect to dashboard after successful post creation
    navigate('/');
  };
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Post</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create and schedule content for your social media platforms
        </p>
      </div>
      
      <Card>
        <CreatePostForm onSuccess={handleSuccess} />
      </Card>
    </div>
  );
};

export default CreatePost;