import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">Readwell could not find that page</h1>
      <p className="text-stone-600">It may have moved, or the link may be wrong.</p>
      <Link to="/" className="text-sm font-medium text-emerald-700 hover:underline">
        Back to the home page
      </Link>
    </div>
  );
}
