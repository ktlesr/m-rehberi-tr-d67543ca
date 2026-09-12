import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import PostPage from './pages/PostPage';
import PostsPage from './pages/PostsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="posts" element={<PostsPage />} />
        <Route path="posts/:postId" element={<PostPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
