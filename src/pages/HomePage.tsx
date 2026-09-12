import { Link } from 'react-router-dom';

import PostCard from '../components/PostCard';
import { ErrorState, LoadingState } from '../components/StatusMessage';
import { usePosts } from '../hooks/usePosts';

export default function HomePage() {
  const { data: posts, isPending, error, refetch } = usePosts(3);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold">Short reads, worth your time.</h1>
        <p className="mt-2 text-stone-600">
          Readwell collects short posts from the community. Start with the latest three.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Latest</h2>
        {isPending && <LoadingState />}
        {error && <ErrorState error={error} onRetry={() => void refetch()} />}
        {posts && (
          <div className="grid gap-4 sm:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
        <Link
          to="/posts"
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          See all posts →
        </Link>
      </section>
    </div>
  );
}
