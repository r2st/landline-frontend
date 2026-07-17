import { useQuery } from '@tanstack/react-query';
import { systemApi } from '../api/client';

// What the agent does on its own. Errors are NOT swallowed into a default
// shape: these badges are read during incidents, and the page previously
// invented all of them. "Couldn't check" has to be sayable — a green ON that
// came from a failed request is exactly the lie this replaced.
export function useAutomation() {
  return useQuery({
    queryKey: ['system-automation'],
    queryFn: () => systemApi.automation(),
    staleTime: 60000,
    retry: false,
  });
}
