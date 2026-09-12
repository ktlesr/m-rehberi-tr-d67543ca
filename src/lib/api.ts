/** A small client for JSONPlaceholder, a public read-only API that needs no key. */

const BASE_URL = 'https://jsonplaceholder.typicode.com';

export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

export interface Comment {
  id: number;
  postId: number;
  name: string;
  email: string;
  body: string;
}

export interface User {
  id: number;
  name: string;
  username: string;
  website: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new ApiError(
      `Request to ${path} failed with ${response.status}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export const fetchPosts = (limit: number) => getJson<Post[]>(`/posts?_limit=${limit}`);
export const fetchPost = (id: number) => getJson<Post>(`/posts/${id}`);
export const fetchComments = (postId: number) =>
  getJson<Comment[]>(`/posts/${postId}/comments`);
export const fetchUser = (id: number) => getJson<User>(`/users/${id}`);
