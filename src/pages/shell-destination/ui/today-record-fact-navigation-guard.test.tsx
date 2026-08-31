import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TodayRecordFactNavigationGuard } from './today-record-fact-navigation-guard'

const state = vi.hoisted(() => ({
  scope: {
    abandonAll: vi.fn(),
    hasBlockingIntents: true,
    hasPendingIntents: false,
  },
  blocker: {
    proceed: vi.fn(),
    reset: vi.fn(),
    state: 'blocked' as const,
  },
}))

vi.mock('react-router', () => ({
  useBlocker: () => state.blocker,
  useInRouterContext: () => true,
}))

vi.mock('@/features/record-fact', () => ({
  useRecordFactIntentScopeState: () => state.scope,
}))

describe('TodayRecordFactNavigationGuard', () => {
  beforeEach(() => {
    state.scope.hasPendingIntents = false
    state.blocker.state = 'blocked'
    state.scope.abandonAll.mockReset()
    state.blocker.proceed.mockReset()
    state.blocker.reset.mockReset()
  })

  it('requires an explicit abandon before proceeding with unknown intent', () => {
    render(<TodayRecordFactNavigationGuard />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Неизвестный результат хранится только в памяти',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Уйти и отменить' }))
    expect(state.scope.abandonAll).toHaveBeenCalledOnce()
    expect(state.blocker.proceed).toHaveBeenCalledOnce()
  })

  it('does not permit leaving while a request is pending', () => {
    state.scope.hasPendingIntents = true
    render(<TodayRecordFactNavigationGuard />)

    expect(
      screen.getByRole('button', { name: 'Уйти и отменить' }),
    ).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Остаться' }))
    expect(state.blocker.reset).toHaveBeenCalledOnce()
    expect(state.blocker.proceed).not.toHaveBeenCalled()
  })

  it('installs and cleans up a native beforeunload confirmation', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<TodayRecordFactNavigationGuard />)

    const listener = addSpy.mock.calls.find(
      ([eventName]) => eventName === 'beforeunload',
    )?.[1]
    expect(listener).toBeTypeOf('function')
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)

    unmount()
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', listener)
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
