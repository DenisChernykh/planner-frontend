import { describe, expect, it } from 'vitest'

import type { WorkspaceCurrentResponseV1 } from '@/shared/api'

import { selectWorkspacePresentation } from './workspace-presentation'

const currentMemberId = '11111111-1111-4111-8111-111111111111'
const partnerMemberId = '22222222-2222-4222-8222-222222222222'

const workspace = {
  currentMemberId,
  members: [
    {
      displayName: 'Таня',
      memberId: partnerMemberId,
      persona: 'tanya',
      relation: 'partner',
    },
    {
      displayName: 'Денис',
      memberId: currentMemberId,
      persona: 'denis',
      relation: 'current',
    },
  ],
  personaMappingState: 'bound',
  spaceId: '33333333-3333-4333-8333-333333333333',
  timeZone: 'Asia/Yekaterinburg',
} satisfies WorkspaceCurrentResponseV1

describe('workspace presentation selector', () => {
  it('selects current and partner by relation rather than array order', () => {
    const presentation = selectWorkspacePresentation(workspace)

    expect(presentation).toEqual({
      currentMember: { displayName: 'Денис' },
      partnerMember: { displayName: 'Таня' },
      timeZone: 'Asia/Yekaterinburg',
    })
    expect(Object.keys(presentation)).toEqual([
      'currentMember',
      'partnerMember',
      'timeZone',
    ])
    expect(JSON.stringify(presentation)).not.toContain(currentMemberId)
    expect(JSON.stringify(presentation)).not.toContain(partnerMemberId)
    expect(JSON.stringify(presentation)).not.toContain('persona')
  })

  it('accepts the relative labels of an unbound workspace', () => {
    expect(
      selectWorkspacePresentation({
        ...workspace,
        members: [
          {
            ...workspace.members[0],
            displayName: 'Партнёр',
            persona: null,
          },
          {
            ...workspace.members[1],
            displayName: 'Вы',
            persona: null,
          },
        ],
        personaMappingState: 'unbound',
      }),
    ).toEqual({
      currentMember: { displayName: 'Вы' },
      partnerMember: { displayName: 'Партнёр' },
      timeZone: 'Asia/Yekaterinburg',
    })
  })
})
