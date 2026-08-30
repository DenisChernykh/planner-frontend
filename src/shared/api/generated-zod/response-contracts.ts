/**
 * Generated from openapi/openapi.json by scripts/openapi/generate-runtime-contract.mjs.
 * Do not edit manually.
 */
import type { ZodType } from 'zod'

const loadAuthSchemas = () => import('./auth/auth.zod')
const loadHealthSchemas = () => import('./health/health.zod')
const loadPlanningSchemas = () => import('./planning/planning.zod')
const loadRemindersSchemas = () => import('./reminders/reminders.zod')
const loadReportingSchemas = () => import('./reporting/reporting.zod')
const loadTelegramSchemas = () => import('./telegram/telegram.zod')
const loadTrackingSchemas = () => import('./tracking/tracking.zod')
const loadWorkspaceSchemas = () => import('./workspace/workspace.zod')

export type GeneratedApiResponse =
  | {
      readonly status: number
      readonly outcome: 'success' | 'documented-error'
      readonly mediaType: 'application/json'
      readonly loadSchema: () => Promise<ZodType<unknown>>
    }
  | {
      readonly status: number
      readonly outcome: 'success'
      readonly mediaType: null
      readonly loadSchema: null
    }

export type GeneratedApiResponseContract = Readonly<{
  method: string
  operationId: string
  path: string
  responses: readonly GeneratedApiResponse[]
}>

export const GENERATED_API_RESPONSE_CONTRACTS = [
  {
    method: 'GET',
    operationId: 'AuthController_csrfToken',
    path: '/auth/csrf',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadAuthSchemas()).AuthControllerCsrfToken200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'AuthController_logout',
    path: '/auth/logout',
    responses: [
      {
        status: 204,
        outcome: 'success',
        mediaType: null,
        loadSchema: null,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'AuthController_me',
    path: '/auth/me',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadAuthSchemas()).AuthControllerMe200Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'healthLive',
    path: '/health/live',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadHealthSchemas()).HealthLive200Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'healthReady',
    path: '/health/ready',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadHealthSchemas()).HealthReady200Response,
      },
      {
        status: 503,
        outcome: 'documented-error',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadHealthSchemas()).HealthReady503Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'healthStartup',
    path: '/health/startup',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadHealthSchemas()).HealthStartup200Response,
      },
      {
        status: 503,
        outcome: 'documented-error',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadHealthSchemas()).HealthStartup503Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'PlanningController_list',
    path: '/planning/catalog/goal-definitions',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas()).PlanningControllerList200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningController_create',
    path: '/planning/catalog/goal-definitions',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas()).PlanningControllerCreate201Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'PlanningController_get',
    path: '/planning/catalog/goal-definitions/{goalDefinitionId}',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas()).PlanningControllerGet200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningController_archive',
    path: '/planning/catalog/goal-definitions/{goalDefinitionId}/archive',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas()).PlanningControllerArchive200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningController_copy',
    path: '/planning/catalog/goal-definitions/{goalDefinitionId}/copy',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas()).PlanningControllerCopy201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningController_restore',
    path: '/planning/catalog/goal-definitions/{goalDefinitionId}/restore',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas()).PlanningControllerRestore200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningController_version',
    path: '/planning/catalog/goal-definitions/{goalDefinitionId}/versions',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas()).PlanningControllerVersion201Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'PlanningDraftController_editor',
    path: '/planning/drafts',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningDraftControllerEditor200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningDraftController_updateMonthFocus',
    path: '/planning/drafts/{planMonthId}/focus',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningDraftControllerUpdateMonthFocus200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningDraftController_add',
    path: '/planning/drafts/{planMonthId}/goals',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas()).PlanningDraftControllerAdd201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningDraftController_remove',
    path: '/planning/drafts/{planMonthId}/goals/{planGoalId}/remove',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningDraftControllerRemove200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningDraftController_update',
    path: '/planning/drafts/{planMonthId}/goals/{planGoalId}/update',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningDraftControllerUpdate200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningDraftController_reorder',
    path: '/planning/drafts/{planMonthId}/goals/reorder',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningDraftControllerReorder200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningDraftController_publish',
    path: '/planning/drafts/{planMonthId}/publish',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningDraftControllerPublish201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningDraftController_republish',
    path: '/planning/drafts/{planMonthId}/republish',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningDraftControllerRepublish201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningDraftController_createEmpty',
    path: '/planning/drafts/empty',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningDraftControllerCreateEmpty201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningDraftController_createFromPublication',
    path: '/planning/drafts/from-publication',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningDraftControllerCreateFromPublication201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningDraftController_createFromSeed',
    path: '/planning/drafts/from-seed',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningDraftControllerCreateFromSeed201Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'PlanningDraftController_publicationPreview',
    path: '/planning/drafts/publication-preview',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningDraftControllerPublicationPreview200Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'PlanningMonthController_list',
    path: '/planning/months',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas()).PlanningMonthControllerList200Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'PlanningMonthController_history',
    path: '/planning/months/{planMonthId}/history',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningMonthControllerHistory200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningMonthController_reclose',
    path: '/planning/months/{planMonthId}/reclose',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningMonthControllerReclose200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningMonthController_reopen',
    path: '/planning/months/{planMonthId}/reopen',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningMonthControllerReopen200Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'PlanningMonthController_active',
    path: '/planning/months/active',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningMonthControllerActive200Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'PlanningPublicationController_get',
    path: '/planning/publications/{publicationId}',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningPublicationControllerGet200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'PlanningPublicationController_cancel',
    path: '/planning/publications/{publicationId}/cancel',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadPlanningSchemas())
            .PlanningPublicationControllerCancel200Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'ReminderSettingsController_deliveryStatus',
    path: '/reminders/delivery-status',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadRemindersSchemas())
            .ReminderSettingsControllerDeliveryStatus200Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'ReminderSettingsController_settings',
    path: '/reminders/settings',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadRemindersSchemas())
            .ReminderSettingsControllerSettings200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'ReminderSettingsController_saveSettings',
    path: '/reminders/settings',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadRemindersSchemas())
            .ReminderSettingsControllerSaveSettings201Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'ReportingController_month',
    path: '/reporting/months/{targetMonth}',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadReportingSchemas()).ReportingControllerMonth200Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'getTelegramNavigation',
    path: '/telegram/navigation',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTelegramSchemas()).GetTelegramNavigation200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'ScalarFactController_recordFact',
    path: '/tracking/facts',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .ScalarFactControllerRecordFact201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'FactMaintenanceController_correct',
    path: '/tracking/facts/{factRecordId}/correct',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .FactMaintenanceControllerCorrect200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'FactMaintenanceController_delete',
    path: '/tracking/facts/{factRecordId}/delete',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .FactMaintenanceControllerDelete200Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'FactMaintenanceController_getHistory',
    path: '/tracking/facts/{factRecordId}/history',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .FactMaintenanceControllerGetHistory200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'FactMaintenanceController_undo',
    path: '/tracking/facts/{factRecordId}/undo',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .FactMaintenanceControllerUndo200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'CompositeFactController_recordChecklistItem',
    path: '/tracking/facts/checklist-item',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .CompositeFactControllerRecordChecklistItem201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'ScalarFactController_recordCheckpoint',
    path: '/tracking/facts/checkpoint',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .ScalarFactControllerRecordCheckpoint201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'CompositeFactController_recordCompositeOccurrence',
    path: '/tracking/facts/composite-occurrence',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .CompositeFactControllerRecordCompositeOccurrence201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'CompositeFactController_recordOrVariant',
    path: '/tracking/facts/or-variant',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .CompositeFactControllerRecordOrVariant201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'ScalarFactController_recordRating',
    path: '/tracking/facts/rating',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .ScalarFactControllerRecordRating201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'CompositeFactController_recordText',
    path: '/tracking/facts/text',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .CompositeFactControllerRecordText201Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'ScalarFactController_recordTime',
    path: '/tracking/facts/time',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .ScalarFactControllerRecordTime201Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'TrackingQueryController_month',
    path: '/tracking/months/{targetMonth}',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas()).TrackingQueryControllerMonth200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'FactMaintenanceController_closeDay',
    path: '/tracking/publications/{publicationId}/days/{localDate}/close',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .FactMaintenanceControllerCloseDay201Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'FactMaintenanceController_closeDayPreview',
    path: '/tracking/publications/{publicationId}/days/{localDate}/close-preview',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .FactMaintenanceControllerCloseDayPreview200Response,
      },
    ],
  },
  {
    method: 'POST',
    operationId: 'FactMaintenanceController_recordWeeklyTaskResult',
    path: '/tracking/publications/{publicationId}/weekly-tasks/{flexiblePeriodId}/result',
    responses: [
      {
        status: 201,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas())
            .FactMaintenanceControllerRecordWeeklyTaskResult201Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'TrackingQueryController_today',
    path: '/tracking/today',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadTrackingSchemas()).TrackingQueryControllerToday200Response,
      },
    ],
  },
  {
    method: 'GET',
    operationId: 'WorkspaceController_current',
    path: '/workspace/current',
    responses: [
      {
        status: 200,
        outcome: 'success',
        mediaType: 'application/json',
        loadSchema: async () =>
          (await loadWorkspaceSchemas()).WorkspaceControllerCurrent200Response,
      },
    ],
  },
] as const satisfies readonly GeneratedApiResponseContract[]
