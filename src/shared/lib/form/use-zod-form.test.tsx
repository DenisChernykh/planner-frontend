import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { z } from 'zod'

import { useZodForm } from '.'

const transformedSchema = z.strictObject({
  amount: z
    .string()
    .trim()
    .transform((value) => Number(value)),
})

const plannerPathSchema = z.strictObject({
  goalId: z.uuid(),
})

function TransformedForm({
  onSubmit,
}: {
  onSubmit: (value: z.output<typeof transformedSchema>) => void
}) {
  const form = useZodForm(transformedSchema, {
    defaultValues: { amount: '' },
  })
  const rawAmount = form.watch('amount')

  expectTypeOf(rawAmount).toEqualTypeOf<string>()

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <input aria-label="Количество" {...form.register('amount')} />
      <output data-testid="raw-amount">{JSON.stringify(rawAmount)}</output>
      <button type="submit">Сохранить</button>
    </form>
  )
}

function ContractSchemaForm({
  onSubmit,
}: {
  onSubmit: (value: z.output<typeof plannerPathSchema>) => void
}) {
  const form = useZodForm(plannerPathSchema, {
    defaultValues: { goalId: '' },
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <input aria-label="ID цели" {...form.register('goalId')} />
      <button type="submit">Открыть</button>
    </form>
  )
}

describe('useZodForm', () => {
  it('keeps Zod input in form state and submits transformed output', async () => {
    const onSubmit =
      vi.fn<(value: z.output<typeof transformedSchema>) => void>()
    const user = userEvent.setup()

    render(<TransformedForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Количество'), ' 42 ')

    expect(screen.getByTestId('raw-amount')).toHaveTextContent('" 42 "', {
      normalizeWhitespace: false,
    })

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ amount: 42 })
  })

  it('accepts the same strict Zod shape as a generated OpenAPI schema', async () => {
    const goalId = 'C9C6CBCA-47E6-4AB0-932E-30F7A0E97184'
    const onSubmit =
      vi.fn<(value: z.output<typeof plannerPathSchema>) => void>()
    const user = userEvent.setup()

    render(<ContractSchemaForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('ID цели'), goalId)
    await user.click(screen.getByRole('button', { name: 'Открыть' }))

    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ goalId })
  })
})
