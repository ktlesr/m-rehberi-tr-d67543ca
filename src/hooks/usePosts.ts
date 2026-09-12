import { useQuery } from '@tanstack/react-query';

import { fetchComments, fetchPost, fetchPosts, fetchUser } from '../lib/api';

export function usePosts(limit = 12) {
  return useQuery({ queryKey: ['posts', limit], queryFn: () => fetchPosts(limit) });
}

export function usePost(id: number) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => fetchPost(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useComments(postId: number) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId),
    enabled: Number.isInteger(postId) && postId > 0,
  });
}

export function useUser(id: number | undefined) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id as number),
    enabled: id !== undefined,
  });
}
