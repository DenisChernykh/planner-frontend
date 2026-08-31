import { describe, expect, it } from 'vitest'

import {
  ApiProblemError,
  CompositeFactControllerRecordText422Response,
} from '@/shared/api'

import { formatRecordFactError } from './record-fact-error'

describe('record fact error presentation', () => {
  it('binds known validation pointers and hides unknown details', () => {
    const error = new ApiProblemError(
      {
        type: 'https://planner.example.test/problems/validation',
        title: 'Validation failed',
        status: 422,
        detail: 'secret backend detail',
        instance: 'urn:request:validation',
        code: 'VALIDATION_FAILED',
        requestId: 'request-123',
        errors: [
          { code: 'invalid', detail: 'bad text', pointer: '/text' },
          { code: 'secret', detail: 'secret detail', pointer: '/internal' },
        ],
      },
      null,
    )

    expect(
      formatRecordFactError(
        error,
        ['/text'],
        CompositeFactControllerRecordText422Response,
      ),
    ).toBe('Проверьте поля: текст. Запрос: request-123.')
    const safeSummary = formatRecordFactError(
      error,
      ['/value'],
      CompositeFactControllerRecordText422Response,
    )
    expect(safeSummary).toContain('Запрос: request-123')
    expect(safeSummary).not.toContain('secret')
  })

  it('does not read validation pointers when operation schema validation fails', () => {
    const error = new ApiProblemError(
      {
        type: 'https://planner.example.test/problems/validation',
        title: 'Validation failed',
        status: 422,
        detail: 'private detail',
        instance: 'urn:request:invalid',
        code: 'VALIDATION_FAILED',
        requestId: 'request-invalid',
        errors: [{ code: 'invalid', detail: 42, pointer: '/text' }],
      },
      null,
    )
    const safeSummary = formatRecordFactError(
      error,
      ['/text'],
      CompositeFactControllerRecordText422Response,
    )
    expect(safeSummary).toBe(
      'Не удалось сохранить значение. Запрос: request-invalid.',
    )
    expect(safeSummary).not.toContain('/text')
    expect(safeSummary).not.toContain('private')
  })
})
