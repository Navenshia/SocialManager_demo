import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import CreatePost from './pages/CreatePost';
import Settings from './pages/Settings';
import SchedulerPage from './pages/Scheduler';
import CommentsPage from './pages/Comments';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/scheduler" element={<SchedulerPage />} />
          <Route path="/comments" element={<CommentsPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">404 - Page Not Found</h2>
              <p className="text-gray-600 dark:text-gray-400">The page you are looking for does not exist.</p>
            </div>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
