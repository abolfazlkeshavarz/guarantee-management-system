import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// Helper function to invalidate dashboard data
export function invalidateDashboard() {
  return queryClient.invalidateQueries({ queryKey: ['dashboard'] })
}

// Helper function to invalidate all list queries
export function invalidateAllLists() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['customers'] }),
    queryClient.invalidateQueries({ queryKey: ['products'] }),
    queryClient.invalidateQueries({ queryKey: ['guarantees'] }),
    queryClient.invalidateQueries({ queryKey: ['technicians'] }),
    queryClient.invalidateQueries({ queryKey: ['repairs'] }),
    queryClient.invalidateQueries({ queryKey: ['categories'] }),
  ])
}