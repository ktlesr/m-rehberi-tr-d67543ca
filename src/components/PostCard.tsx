import { Link } from 'react-router-dom';

import type { Post } from '../lib/api';

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="font-medium capitalize">
        <Link to={`/posts/${post.id}`} className="hover:text-emerald-700">
          {post.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-stone-600">{post.body}</p>
    </article>
  );
}
