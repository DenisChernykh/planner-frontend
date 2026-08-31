import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  RecordFactIntentScopeProvider,
  useRecordFactIntentScope,
  useRecordFactIntentScopeState,
} from '../index'

const abandon = vi.fn()

function RegisteredIntent() {
  useRecordFactIntentScope('unknown', abandon)
  const scope = useRecordFactIntentScopeState()
  return <output>{scope.hasBlockingIntents ? 'blocked' : 'idle'}</output>
}

describe('RecordFactIntentScopeProvider', () => {
  it('tracks a mounted unknown intent without registration churn', async () => {
    render(
      <RecordFactIntentScopeProvider>
        <RegisteredIntent />
      </RecordFactIntentScopeProvider>,
    )

    expect(await screen.findByText('blocked')).toBeInTheDocument()
  })
})
