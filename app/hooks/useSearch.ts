import { useQuery } from "@tanstack/react-query";
import { searchItems } from "../services/api";

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],

    queryFn: () => searchItems(query),

    enabled: query.trim().length >= 2,

    staleTime: 1000 * 60,
  });
}