/**
 * Generated from openapi/openapi.json by scripts/openapi/generate-runtime-contract.mjs.
 * Do not edit manually.
 */
import type { ZodType } from 'zod'

import {
  AuthControllerCsrfToken200Response,
  AuthControllerMe200Response,
} from './auth/auth.zod'
import {
  HealthLive200Response,
  HealthReady200Response,
  HealthStartup200Response,
} from './health/health.zod'
import {
  PlanningControllerArchive200Response,
  PlanningControllerCopy201Response,
  PlanningControllerCreate201Response,
  PlanningControllerGet200Response,
  PlanningControllerList200Response,
  PlanningControllerRestore200Response,
  PlanningControllerVersion201Response,
  PlanningDraftControllerAdd201Response,
  PlanningDraftControllerCreateFromSeed201Response,
  PlanningDraftControllerEditor200Response,
  PlanningDraftControllerPublicationPreview200Response,
  PlanningDraftControllerPublish201Response,
  PlanningDraftControllerRemove200Response,
  PlanningDraftControllerReorder200Response,
  PlanningDraftControllerUpdate200Response,
  PlanningMonthControllerActive200Response,
  PlanningMonthControllerReclose200Response,
  PlanningMonthControllerReopen200Response,
  PlanningPublicationControllerGet200Response,
} from './planning/planning.zod'
import {
  ReminderSettingsControllerDeliveryStatus200Response,
  ReminderSettingsControllerSaveSettings201Response,
  ReminderSettingsControllerSettings200Response,
} from './reminders/reminders.zod'
import { ReportingControllerMonth200Response } from './reporting/reporting.zod'
import {
  CompositeFactControllerRecordChecklistItem201Response,
  CompositeFactControllerRecordCompositeOccurrence201Response,
  CompositeFactControllerRecordOrVariant201Response,
  CompositeFactControllerRecordText201Response,
  FactMaintenanceControllerCloseDay201Response,
  FactMaintenanceControllerCloseDayPreview200Response,
  FactMaintenanceControllerCorrect200Response,
  FactMaintenanceControllerDelete200Response,
  FactMaintenanceControllerRecordWeeklyTaskResult201Response,
  FactMaintenanceControllerUndo200Response,
  ScalarFactControllerRecordCheckpoint201Response,
  ScalarFactControllerRecordFact201Response,
  ScalarFactControllerRecordRating201Response,
  ScalarFactControllerRecordTime201Response,
  TrackingQueryControllerMonth200Response,
  TrackingQueryControllerToday200Response,
} from './tracking/tracking.zod'

export type GeneratedSuccessResponse =
  | {
      readonly status: number
      readonly mediaType: 'application/json'
      readonly schema: ZodType<unknown>
    }
  | { readonly status: number; readonly mediaType: null; readonly schema: null }

export type GeneratedSuccessResponseContract = Readonly<{
  method: string
  operationId: string
  path: string
  responses: readonly GeneratedSuccessResponse[]
}>

export const GENERATED_SUCCESS_RESPONSE_CONTRACTS = [
  {
    method: 'GET',
    operationId: 'AuthController_csrfToken',
    path: '/auth/csrf',
    responses: [
      {
        status: 200,
        mediaType: 'application/json',
        schema: AuthControllerCsrfToken200Response,
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
        mediaType: null,
        schema: null,
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
        mediaType: 'application/json',
        schema: AuthControllerMe200Response,
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
        mediaType: 'application/json',
        schema: HealthLive200Response,
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
        mediaType: 'application/json',
        schema: HealthReady200Response,
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
        mediaType: 'application/json',
        schema: HealthStartup200Response,
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
        mediaType: 'application/json',
        schema: PlanningControllerList200Response,
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
        mediaType: 'application/json',
        schema: PlanningControllerCreate201Response,
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
        mediaType: 'application/json',
        schema: PlanningControllerGet200Response,
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
        mediaType: 'application/json',
        schema: PlanningControllerArchive200Response,
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
        mediaType: 'application/json',
        schema: PlanningControllerCopy201Response,
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
        mediaType: 'application/json',
        schema: PlanningControllerRestore200Response,
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
        mediaType: 'application/json',
        schema: PlanningControllerVersion201Response,
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
        mediaType: 'application/json',
        schema: PlanningDraftControllerEditor200Response,
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
        mediaType: 'application/json',
        schema: PlanningDraftControllerAdd201Response,
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
        mediaType: 'application/json',
        schema: PlanningDraftControllerRemove200Response,
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
        mediaType: 'application/json',
        schema: PlanningDraftControllerUpdate200Response,
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
        mediaType: 'application/json',
        schema: PlanningDraftControllerReorder200Response,
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
        mediaType: 'application/json',
        schema: PlanningDraftControllerPublish201Response,
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
        mediaType: 'application/json',
        schema: PlanningDraftControllerCreateFromSeed201Response,
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
        mediaType: 'application/json',
        schema: PlanningDraftControllerPublicationPreview200Response,
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
        mediaType: 'application/json',
        schema: PlanningMonthControllerReclose200Response,
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
        mediaType: 'application/json',
        schema: PlanningMonthControllerReopen200Response,
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
        mediaType: 'application/json',
        schema: PlanningMonthControllerActive200Response,
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
        mediaType: 'application/json',
        schema: PlanningPublicationControllerGet200Response,
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
        mediaType: 'application/json',
        schema: ReminderSettingsControllerDeliveryStatus200Response,
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
        mediaType: 'application/json',
        schema: ReminderSettingsControllerSettings200Response,
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
        mediaType: 'application/json',
        schema: ReminderSettingsControllerSaveSettings201Response,
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
        mediaType: 'application/json',
        schema: ReportingControllerMonth200Response,
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
        mediaType: 'application/json',
        schema: ScalarFactControllerRecordFact201Response,
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
        mediaType: 'application/json',
        schema: FactMaintenanceControllerCorrect200Response,
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
        mediaType: 'application/json',
        schema: FactMaintenanceControllerDelete200Response,
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
        mediaType: 'application/json',
        schema: FactMaintenanceControllerUndo200Response,
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
        mediaType: 'application/json',
        schema: CompositeFactControllerRecordChecklistItem201Response,
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
        mediaType: 'application/json',
        schema: ScalarFactControllerRecordCheckpoint201Response,
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
        mediaType: 'application/json',
        schema: CompositeFactControllerRecordCompositeOccurrence201Response,
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
        mediaType: 'application/json',
        schema: CompositeFactControllerRecordOrVariant201Response,
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
        mediaType: 'application/json',
        schema: ScalarFactControllerRecordRating201Response,
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
        mediaType: 'application/json',
        schema: CompositeFactControllerRecordText201Response,
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
        mediaType: 'application/json',
        schema: ScalarFactControllerRecordTime201Response,
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
        mediaType: 'application/json',
        schema: TrackingQueryControllerMonth200Response,
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
        mediaType: 'application/json',
        schema: FactMaintenanceControllerCloseDay201Response,
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
        mediaType: 'application/json',
        schema: FactMaintenanceControllerCloseDayPreview200Response,
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
        mediaType: 'application/json',
        schema: FactMaintenanceControllerRecordWeeklyTaskResult201Response,
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
        mediaType: 'application/json',
        schema: TrackingQueryControllerToday200Response,
      },
    ],
  },
] as const satisfies readonly GeneratedSuccessResponseContract[]
