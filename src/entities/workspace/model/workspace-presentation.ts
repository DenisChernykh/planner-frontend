import { ApiProtocolError, type WorkspaceCurrentResponseV1 } from '@/shared/api'

type WorkspaceMemberPresentation = Readonly<{
  displayName: WorkspaceCurrentResponseV1['members'][number]['displayName']
}>

type WorkspaceMember = WorkspaceCurrentResponseV1['members'][number]

export type WorkspacePresentation = Readonly<{
  currentMember: WorkspaceMemberPresentation
  partnerMember: WorkspaceMemberPresentation
  timeZone: WorkspaceCurrentResponseV1['timeZone']
}>

function hasConsistentPersonaMapping(
  workspace: WorkspaceCurrentResponseV1,
  currentMember: WorkspaceMember,
  partnerMember: WorkspaceMember,
) {
  if (workspace.personaMappingState === 'unbound') {
    return (
      currentMember.persona === null &&
      partnerMember.persona === null &&
      currentMember.displayName === 'Вы' &&
      partnerMember.displayName === 'Партнёр'
    )
  }

  const expectedDisplayName = (member: WorkspaceMember) => {
    if (member.persona === 'denis') return 'Денис'
    if (member.persona === 'tanya') return 'Таня'
    return null
  }

  return (
    currentMember.persona !== null &&
    partnerMember.persona !== null &&
    currentMember.persona !== partnerMember.persona &&
    currentMember.displayName === expectedDisplayName(currentMember) &&
    partnerMember.displayName === expectedDisplayName(partnerMember)
  )
}

/**
 * Converts the workspace DTO into the only member context exposed to UI.
 *
 * UUIDs, persona values and array position are deliberately absent from the
 * returned projection.
 */
export function selectWorkspacePresentation(
  workspace: WorkspaceCurrentResponseV1,
): WorkspacePresentation {
  const currentMembers = workspace.members.filter(
    (member) => member.relation === 'current',
  )
  const partnerMembers = workspace.members.filter(
    (member) => member.relation === 'partner',
  )
  const currentMember = currentMembers[0]
  const partnerMember = partnerMembers[0]

  if (
    workspace.members.length !== 2 ||
    currentMembers.length !== 1 ||
    partnerMembers.length !== 1 ||
    currentMember === undefined ||
    partnerMember === undefined ||
    currentMember.memberId !== workspace.currentMemberId ||
    currentMember.memberId === partnerMember.memberId ||
    !hasConsistentPersonaMapping(workspace, currentMember, partnerMember)
  ) {
    throw new ApiProtocolError()
  }

  return Object.freeze({
    currentMember: Object.freeze({ displayName: currentMember.displayName }),
    partnerMember: Object.freeze({ displayName: partnerMember.displayName }),
    timeZone: workspace.timeZone,
  })
}
