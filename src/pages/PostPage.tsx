import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { ErrorState, LoadingState } from '../components/StatusMessage';
import { useComments, usePost, useUser } from '../hooks/usePosts';
import NotFoundPage from './NotFoundPage';

export default function PostPage() {
  const postId = Number(useParams().postId);
  const post = usePost(postId);
  const author = useUser(post.data?.userId);
  const comments = useComments(postId);

  if (!Number.isInteger(postId) || postId < 1) return <NotFoundPage />;
  if (post.isPending) return <LoadingState label="Loading post…" />;
  if (post.error)
    return <ErrorState error={post.error} onRetry={() => void post.refetch()} />;

  return (
    <article className="space-y-6">
      <Link
        to="/posts"
        className="flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All posts
      </Link>

      <header>
        <h1 className="text-2xl font-bold capitalize">{post.data.title}</h1>
        <p className="mt-1 text-sm text-stone-500">
          {author.data ? `By ${author.data.name}` : 'Loading author…'}
        </p>
      </header>

      <p className="leading-relaxed whitespace-pre-line">{post.data.body}</p>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-5 w-5" aria-hidden />
          Comments
        </h2>
        {comments.isPending && <LoadingState label="Loading comments…" />}
        {comments.error && <ErrorState error={comments.error} />}
        <ul className="space-y-3">
          {comments.data?.map((comment) => (
            <li
              key={comment.id}
              className="rounded-md border border-stone-200 bg-white p-3"
            >
              <p className="text-sm font-medium">{comment.name}</p>
              <p className="text-xs text-stone-500">{comment.email}</p>
              <p className="mt-1 text-sm">{comment.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
