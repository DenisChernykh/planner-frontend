import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Sidebar, SidebarProvider, SidebarTrigger } from './sidebar'

vi.mock('@/shared/lib/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

describe('SidebarProvider', () => {
  it('keeps collapse state in memory without creating a browser cookie', async () => {
    document.cookie = 'sidebar_state=; max-age=0; path=/'
    const user = userEvent.setup()

    render(
      <SidebarProvider>
        <Sidebar>
          <span>Навигация</span>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    )

    const sidebar = screen.getByText('Навигация').closest('[data-slot=sidebar]')
    expect(sidebar).toHaveAttribute('data-state', 'expanded')

    await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))

    expect(sidebar).toHaveAttribute('data-state', 'collapsed')
    expect(document.cookie).not.toContain('sidebar_state=')
  })
})
