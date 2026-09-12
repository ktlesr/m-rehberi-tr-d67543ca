import { formatDistanceToNow } from 'date-fns';

import PostCard from '../components/PostCard';
import { ErrorState, LoadingState } from '../components/StatusMessage';
import { usePosts } from '../hooks/usePosts';

export default function PostsPage() {
  const { data: posts, isPending, error, refetch, dataUpdatedAt } = usePosts();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">All posts</h1>
      {isPending && <LoadingState label="Loading posts…" />}
      {error && <ErrorState error={error} onRetry={() => void refetch()} />}
      {posts && (
        <>
          <p className="text-xs text-stone-500">
            Updated {formatDistanceToNow(dataUpdatedAt, { addSuffix: true })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
