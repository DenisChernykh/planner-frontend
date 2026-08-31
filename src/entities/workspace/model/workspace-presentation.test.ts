import { describe, expect, it } from 'vitest'

import { ApiProtocolError, type WorkspaceCurrentResponseV1 } from '@/shared/api'

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

  it('rejects a currentMemberId that does not identify the current relation', () => {
    expect(() =>
      selectWorkspacePresentation({
        ...workspace,
        currentMemberId: partnerMemberId,
      }),
    ).toThrow(ApiProtocolError)
  })

  it('rejects duplicate or missing member relations', () => {
    expect(() =>
      selectWorkspacePresentation({
        ...workspace,
        members: workspace.members.map((member) => ({
          ...member,
          relation: 'current' as const,
        })),
      }),
    ).toThrow(ApiProtocolError)
  })

  it('rejects two relations bound to the same member identifier', () => {
    expect(() =>
      selectWorkspacePresentation({
        ...workspace,
        members: workspace.members.map((member) => ({
          ...member,
          memberId: currentMemberId,
        })),
      }),
    ).toThrow(ApiProtocolError)
  })

  it.each([
    {
      name: 'an unbound workspace with bound labels',
      value: {
        ...workspace,
        members: workspace.members.map((member) => ({
          ...member,
          persona: null,
        })),
        personaMappingState: 'unbound' as const,
      },
    },
    {
      name: 'an unbound workspace with a persona',
      value: {
        ...workspace,
        members: [
          { ...workspace.members[0], displayName: 'Партнёр' as const },
          {
            ...workspace.members[1],
            displayName: 'Вы' as const,
            persona: null,
          },
        ],
        personaMappingState: 'unbound' as const,
      },
    },
    {
      name: 'a bound workspace with a null persona',
      value: {
        ...workspace,
        members: workspace.members.map((member, index) =>
          index === 0 ? { ...member, persona: null } : member,
        ),
      },
    },
    {
      name: 'a bound workspace with duplicate personas',
      value: {
        ...workspace,
        members: workspace.members.map((member) => ({
          ...member,
          displayName: 'Денис' as const,
          persona: 'denis' as const,
        })),
      },
    },
    {
      name: 'a bound workspace with a contradictory label',
      value: {
        ...workspace,
        members: workspace.members.map((member, index) =>
          index === 0 ? { ...member, displayName: 'Денис' as const } : member,
        ),
      },
    },
  ])('rejects $name', ({ value }) => {
    expect(() =>
      selectWorkspacePresentation({
        ...value,
        members: [...value.members],
      }),
    ).toThrow(ApiProtocolError)
  })
})
