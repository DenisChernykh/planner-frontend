import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authControllerMe,
  peekCsrfToken,
  setCsrfToken,
  type AuthenticatedPrincipalResponseDto,
} from '@/shared/api'

import {
  clearCurrentSession,
  currentSessionQueryKey,
  loadCurrentSession,
  useCurrentSession,
} from './current-session'

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>()
  return { ...actual, authControllerMe: vi.fn() }
})

const session = {
  sessionId: 'abcdefghijklmnopqrstuv',
  userId: 'current-user',
} satisfies AuthenticatedPrincipalResponseDto

describe('current session entity', () => {
  beforeEach(() => {
    vi.mocked(authControllerMe).mockReset()
  })

  it('loads a fresh session with the caller signal and caches it', async () => {
    const queryClient = new QueryClient()
    const controller = new AbortController()
    vi.mocked(authControllerMe).mockResolvedValue(session)

    await expect(
      loadCurrentSession(queryClient, controller.signal),
    ).resolves.toEqual(session)

    expect(authControllerMe).toHaveBeenCalledWith(undefined, controller.signal)
    expect(queryClient.getQueryData(currentSessionQueryKey)).toEqual(session)
  })

  it('uses the loader-populated cache without issuing a second auth request', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(currentSessionQueryKey, session)
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useCurrentSession(), { wrapper })

    expect(result.current.data).toEqual(session)
    expect(authControllerMe).not.toHaveBeenCalled()
  })

  it('does not overwrite the previous principal when the fresh load aborts', async () => {
    const queryClient = new QueryClient()
    const previousSession = { ...session, userId: 'previous-user' }
    const controller = new AbortController()
    queryClient.setQueryData(currentSessionQueryKey, previousSession)
    vi.mocked(authControllerMe).mockImplementation(
      (_options, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          })
        }),
    )

    const load = loadCurrentSession(queryClient, controller.signal)
    controller.abort()

    await expect(load).rejects.toBe(controller.signal.reason)
    expect(queryClient.getQueryData(currentSessionQueryKey)).toEqual(
      previousSession,
    )
  })

  it('clears the previous principal cache when fresh auth changes session', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(currentSessionQueryKey, {
      ...session,
      sessionId: 'previous_session_value',
    })
    queryClient.setQueryData(['private', 'workspace'], { visible: true })
    setCsrfToken('previous-csrf')
    vi.mocked(authControllerMe).mockResolvedValue(session)

    await loadCurrentSession(queryClient, new AbortController().signal)

    expect(queryClient.getQueryData(currentSessionQueryKey)).toEqual(session)
    expect(queryClient.getQueryData(['private', 'workspace'])).toBeUndefined()
    expect(peekCsrfToken()).toBeNull()
  })

  it('announces a principal replacement before clearing private cache', async () => {
    const queryClient = new QueryClient()
    const previousSession = {
      ...session,
      sessionId: 'previous_session_value',
    }
    queryClient.setQueryData(currentSessionQueryKey, previousSession)
    queryClient.setQueryData(['private', 'workspace'], { visible: true })
    vi.mocked(authControllerMe).mockResolvedValue(session)
    const onPrincipalChange = vi.fn(() => {
      expect(queryClient.getQueryData(['private', 'workspace'])).toEqual({
        visible: true,
      })
    })

    await loadCurrentSession(queryClient, new AbortController().signal, {
      onPrincipalChange,
    })

    expect(onPrincipalChange).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(['private', 'workspace'])).toBeUndefined()
    expect(queryClient.getQueryData(currentSessionQueryKey)).toEqual(session)
  })

  it('serializes concurrent fresh decisions so an older response cannot win last', async () => {
    const queryClient = new QueryClient()
    let resolveFirst!: (value: AuthenticatedPrincipalResponseDto) => void
    let resolveSecond!: (value: AuthenticatedPrincipalResponseDto) => void
    const firstResponse = new Promise<AuthenticatedPrincipalResponseDto>(
      (resolve) => {
        resolveFirst = resolve
      },
    )
    const secondResponse = new Promise<AuthenticatedPrincipalResponseDto>(
      (resolve) => {
        resolveSecond = resolve
      },
    )
    const newerSession = {
      sessionId: 'newer_session_value_01',
      userId: 'newer-user',
    }
    vi.mocked(authControllerMe)
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(secondResponse)

    const firstLoad = loadCurrentSession(
      queryClient,
      new AbortController().signal,
    )
    const secondLoad = loadCurrentSession(
      queryClient,
      new AbortController().signal,
    )
    await vi.waitFor(() => expect(authControllerMe).toHaveBeenCalledOnce())

    resolveFirst(session)
    await expect(firstLoad).resolves.toEqual(session)
    await vi.waitFor(() => expect(authControllerMe).toHaveBeenCalledTimes(2))
    resolveSecond(newerSession)

    await expect(secondLoad).resolves.toEqual(newerSession)
    expect(queryClient.getQueryData(currentSessionQueryKey)).toEqual(
      newerSession,
    )
  })

  it('keeps the session queue reserved when an aborted waiter releases early', async () => {
    const queryClient = new QueryClient()
    const waitingController = new AbortController()
    let resolveFirst!: (value: AuthenticatedPrincipalResponseDto) => void
    let resolveLast!: (value: AuthenticatedPrincipalResponseDto) => void
    const firstResponse = new Promise<AuthenticatedPrincipalResponseDto>(
      (resolve) => {
        resolveFirst = resolve
      },
    )
    const lastResponse = new Promise<AuthenticatedPrincipalResponseDto>(
      (resolve) => {
        resolveLast = resolve
      },
    )
    const replacementSession = {
      sessionId: 'replacement_session_01',
      userId: 'replacement-user',
    }
    vi.mocked(authControllerMe)
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(lastResponse)

    const firstLoad = loadCurrentSession(
      queryClient,
      new AbortController().signal,
    )
    const abortedWaiter = loadCurrentSession(
      queryClient,
      waitingController.signal,
    )
    await vi.waitFor(() => expect(authControllerMe).toHaveBeenCalledOnce())

    waitingController.abort()
    await expect(abortedWaiter).rejects.toBe(waitingController.signal.reason)

    const lastLoad = loadCurrentSession(
      queryClient,
      new AbortController().signal,
    )
    await Promise.resolve()
    expect(authControllerMe).toHaveBeenCalledOnce()

    resolveFirst(session)
    await expect(firstLoad).resolves.toEqual(session)
    await vi.waitFor(() => expect(authControllerMe).toHaveBeenCalledTimes(2))

    resolveLast(replacementSession)
    await expect(lastLoad).resolves.toEqual(replacementSession)
    expect(queryClient.getQueryData(currentSessionQueryKey)).toEqual(
      replacementSession,
    )
  })

  it('clears every private query together with the CSRF generation', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(currentSessionQueryKey, session)
    queryClient.setQueryData(['private', 'workspace'], { visible: true })
    setCsrfToken('csrf-token')

    clearCurrentSession(queryClient)

    expect(peekCsrfToken()).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0)
  })
})
