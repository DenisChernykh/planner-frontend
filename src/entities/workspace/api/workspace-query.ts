import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'

import {
  getWorkspaceControllerCurrentQueryKey,
  workspaceControllerCurrent,
} from '@/shared/api'

import { selectWorkspacePresentation } from '../model/workspace-presentation'

export const currentWorkspaceQueryKey = getWorkspaceControllerCurrentQueryKey()

async function fetchCurrentWorkspace(signal: AbortSignal) {
  signal.throwIfAborted()
  const workspace = await workspaceControllerCurrent(undefined, signal)
  signal.throwIfAborted()
  selectWorkspacePresentation(workspace)
  return workspace
}

const workspacePresentationQueryOptions = queryOptions({
  queryKey: currentWorkspaceQueryKey,
  queryFn: ({ signal }) => fetchCurrentWorkspace(signal),
  refetchOnMount: false,
  refetchOnReconnect: false,
  // Browser focus is refreshed through the protected session boundary. A
  // direct observer refetch could read the old principal before auth order is
  // re-established.
  refetchOnWindowFocus: false,
  select: selectWorkspacePresentation,
})

/** Performs a validated authoritative workspace refresh before remount. */
export async function loadCurrentWorkspace(
  queryClient: QueryClient,
  signal: AbortSignal,
) {
  const workspace = await fetchCurrentWorkspace(signal)
  signal.throwIfAborted()
  queryClient.setQueryData(currentWorkspaceQueryKey, workspace)
  return workspace
}

/** Reads a cross-field-validated, UI-safe workspace projection. */
export function useWorkspacePresentation() {
  return useQuery(workspacePresentationQueryOptions)
}
