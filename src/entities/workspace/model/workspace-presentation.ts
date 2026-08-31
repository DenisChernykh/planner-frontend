import type { WorkspaceCurrentResponseV1 } from '@/shared/api'

type WorkspaceMemberPresentation = Readonly<{
  displayName: WorkspaceCurrentResponseV1['members'][number]['displayName']
}>

export type WorkspacePresentation = Readonly<{
  currentMember: WorkspaceMemberPresentation
  partnerMember: WorkspaceMemberPresentation
  timeZone: WorkspaceCurrentResponseV1['timeZone']
}>

/**
 * Converts the workspace DTO into the only member context exposed to UI.
 *
 * UUIDs, persona values and array position are deliberately absent from the
 * returned projection.
 */
export function selectWorkspacePresentation(
  workspace: WorkspaceCurrentResponseV1,
): WorkspacePresentation {
  const currentMember = workspace.members.find(
    (member) => member.relation === 'current',
  )!
  const partnerMember = workspace.members.find(
    (member) => member.relation === 'partner',
  )!

  return Object.freeze({
    currentMember: Object.freeze({ displayName: currentMember.displayName }),
    partnerMember: Object.freeze({ displayName: partnerMember.displayName }),
    timeZone: workspace.timeZone,
  })
}
