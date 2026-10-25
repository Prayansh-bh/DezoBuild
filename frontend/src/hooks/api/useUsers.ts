import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { queryKeys } from "./queryKeys";

/**
 * Hook to retrieve all tenant users, assigned roles, and pending invitations.
 * Queries GET /api/v1/tenants/users.
 */
export function useTenantUsers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: () => usersApi.listTenantUsers(),
    staleTime: 30_000,
  });
}
