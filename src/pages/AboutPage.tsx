export default function AboutPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">About Readwell</h1>
      <p>
        Readwell is a small reading app. Posts and comments come from JSONPlaceholder, a
        public sample API, so everything here is read-only and nothing you type is stored.
      </p>
      <p>
        It is built with Vite, React, TypeScript and Tailwind CSS, routes with React
        Router, and fetches data with TanStack Query.
      </p>
    </div>
  );
}
