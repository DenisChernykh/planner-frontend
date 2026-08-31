import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OnlineStatusProvider, useOnlineStatus } from './online-status'

function Probe() {
  const { isOnline, reconnectVersion } = useOnlineStatus()
  return (
    <p>
      {isOnline ? 'online' : 'offline'} {reconnectVersion}
    </p>
  )
}

describe('OnlineStatusProvider', () => {
  it('tracks explicit browser offline and online transitions', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <OnlineStatusProvider>
          <Probe />
        </OnlineStatusProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByText('online 0')).toBeVisible()

    window.dispatchEvent(new Event('offline'))
    expect(await screen.findByText('offline 0')).toBeVisible()

    window.dispatchEvent(new Event('online'))
    expect(await screen.findByText('online 1')).toBeVisible()
  })
})
