import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  workspaceControllerCurrent,
  type WorkspaceCurrentResponseV1,
} from '@/shared/api'

import {
  currentWorkspaceQueryKey,
  loadCurrentWorkspace,
  useWorkspacePresentation,
} from './workspace-query'

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>()
  return { ...actual, workspaceControllerCurrent: vi.fn() }
})

const workspace = {
  currentMemberId: '11111111-1111-4111-8111-111111111111',
  members: [
    {
      displayName: 'Денис',
      memberId: '11111111-1111-4111-8111-111111111111',
      persona: 'denis',
      relation: 'current',
    },
    {
      displayName: 'Таня',
      memberId: '22222222-2222-4222-8222-222222222222',
      persona: 'tanya',
      relation: 'partner',
    },
  ],
  personaMappingState: 'bound',
  spaceId: '33333333-3333-4333-8333-333333333333',
  timeZone: 'Asia/Yekaterinburg',
} satisfies WorkspaceCurrentResponseV1

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('workspace presentation query', () => {
  beforeEach(() => {
    vi.mocked(workspaceControllerCurrent).mockReset()
  })

  it('exposes only the UI-safe projection', async () => {
    const { queryClient, wrapper } = setup()
    vi.mocked(workspaceControllerCurrent).mockResolvedValue(workspace)

    const { result } = renderHook(() => useWorkspacePresentation(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      currentMember: { displayName: 'Денис' },
      partnerMember: { displayName: 'Таня' },
      timeZone: 'Asia/Yekaterinburg',
    })
    expect(JSON.stringify(result.current.data)).not.toContain(
      workspace.currentMemberId,
    )
    expect(JSON.stringify(result.current.data)).not.toContain(workspace.spaceId)
    expect(JSON.stringify(result.current.data)).not.toContain('persona')
    expect(queryClient.getQueryData(currentWorkspaceQueryKey)).toEqual(
      workspace,
    )
  })

  it('does not cache a workspace after the caller aborts', async () => {
    const queryClient = new QueryClient()
    const controller = new AbortController()
    let resolveWorkspace!: (value: WorkspaceCurrentResponseV1) => void
    vi.mocked(workspaceControllerCurrent).mockReturnValue(
      new Promise((resolve) => {
        resolveWorkspace = resolve
      }),
    )

    const load = loadCurrentWorkspace(queryClient, controller.signal)
    resolveWorkspace(workspace)
    queueMicrotask(() => controller.abort())

    await expect(load).rejects.toMatchObject({ name: 'AbortError' })
    expect(queryClient.getQueryData(currentWorkspaceQueryKey)).toBeUndefined()
  })
})
