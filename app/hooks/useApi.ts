import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserProfile, updateUserProfile } from "../services/api";

// Example: Fetch user profile
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId, // Only run if userId exists
  });
}

// Example: Update user profile
export function useUpdateUserProfile(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => updateUserProfile(userId, data),
    onSuccess: () => {
      // Invalidate and refetch user profile
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

// Example: Fetch a list of items (e.g., posts, products, etc.)
export function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      // Replace with your actual API call
      const response = await fetch("your-api-url/items");
      return response.json();
    },
  });
}

// Example: Create an item
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newItem: any) => {
      const response = await fetch("your-api-url/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate items list to refetch
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Example: Delete an item
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`your-api-url/items/${itemId}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Example: Paginated query
export function usePaginatedItems(page: number, limit: number = 10) {
  return useQuery({
    queryKey: ["items", "paginated", page, limit],
    queryFn: async () => {
      const response = await fetch(
        `your-api-url/items?page=${page}&limit=${limit}`,
      );
      return response.json();
    },
    // keepPreviousData: true, // Keep old data while fetching new
  });
}

// Example: Infinite scroll query
export function useInfiniteItems() {
  return useQuery({
    queryKey: ["items", "infinite"],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`your-api-url/items?cursor=${pageParam}`);
      return response.json();
    },
    // getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
