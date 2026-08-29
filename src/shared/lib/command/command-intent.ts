export type CommandIntentState =
  | 'ready'
  | 'pending'
  | 'unknown'
  | 'confirmed'
  | 'failed'
  | 'stale'
  | 'abandoned'

export type CommandEnvelope<TPayload extends object> = Readonly<
  TPayload & { commandId: string }
>

type CommandSender<TPayload extends object, TResult> = (
  payload: CommandEnvelope<TPayload>,
) => Promise<TResult>

type UnknownOutcomeClassifier = (error: unknown) => boolean

function freezeRecursively<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value
  }

  Object.freeze(value)
  for (const child of Object.values(value)) freezeRecursively(child)
  return value
}

function createEnvelope<TPayload extends object>(
  payload: TPayload,
  commandId: string,
): CommandEnvelope<TPayload> {
  if ('commandId' in payload) {
    throw new Error('Command payload must not define commandId')
  }

  const cloned = structuredClone(payload)
  return freezeRecursively({
    ...cloned,
    commandId,
  }) as CommandEnvelope<TPayload>
}

/** Ошибка недопустимого перехода command intent. */
export class CommandIntentStateError extends Error {
  public constructor(state: CommandIntentState) {
    super(`Command intent transition is not allowed from state: ${state}`)
    this.name = 'CommandIntentStateError'
  }
}

/** Ошибка явного submit, заблокированного в offline-состоянии. */
export class OfflineSubmissionError extends Error {
  public constructor() {
    super('Command submission requires an online connection')
    this.name = 'OfflineSubmissionError'
  }
}

/**
 * Хранит один явный mutation intent только в памяти текущего UI surface.
 *
 * @remarks Повтор после неизвестного исхода использует тот же immutable envelope.
 * Одновременные submit разделяют один Promise и не создают второй HTTP request.
 */
export class CommandIntentController<TPayload extends object, TResult> {
  private readonly isUnknownOutcome: UnknownOutcomeClassifier
  private readonly isStaleOutcome: UnknownOutcomeClassifier
  private readonly createCommandId: () => string
  private envelope: CommandEnvelope<TPayload> | null = null
  private inFlight: Promise<TResult> | null = null
  private intentState: CommandIntentState = 'abandoned'

  public constructor(
    isUnknownOutcome: UnknownOutcomeClassifier,
    createCommandId: () => string = () => crypto.randomUUID(),
    isStaleOutcome: UnknownOutcomeClassifier = () => false,
  ) {
    this.isUnknownOutcome = isUnknownOutcome
    this.createCommandId = createCommandId
    this.isStaleOutcome = isStaleOutcome
  }

  public get state() {
    return this.intentState
  }

  public get payload() {
    return this.envelope
  }

  /** Создаёт новый intent до первого request. */
  public begin(payload: TPayload) {
    if (this.inFlight !== null) throw new CommandIntentStateError('pending')
    if (this.intentState !== 'abandoned') {
      throw new CommandIntentStateError(this.intentState)
    }

    this.envelope = createEnvelope(payload, this.createCommandId())
    this.intentState = 'ready'
    return this.envelope
  }

  /** Отправляет intent либо возвращает уже выполняющийся Promise. */
  public submit(sender: CommandSender<TPayload, TResult>): Promise<TResult> {
    if (this.inFlight !== null) return this.inFlight
    if (
      this.envelope === null ||
      !['ready', 'unknown'].includes(this.intentState)
    ) {
      throw new CommandIntentStateError(this.intentState)
    }

    this.intentState = 'pending'
    const envelope = this.envelope
    const request = Promise.resolve().then(() => sender(envelope))
    const tracked = request
      .then((result) => {
        this.intentState = 'confirmed'
        return result
      })
      .catch((error: unknown) => {
        this.intentState = this.isUnknownOutcome(error)
          ? 'unknown'
          : this.isStaleOutcome(error)
            ? 'stale'
            : 'failed'
        throw error
      })
      .finally(() => {
        if (this.inFlight === tracked) this.inFlight = null
      })

    this.inFlight = tracked
    return tracked
  }

  /** Не создаёт request и не ставит его в очередь, пока приложение offline. */
  public submitWhenOnline(
    online: boolean,
    sender: CommandSender<TPayload, TResult>,
  ) {
    return online
      ? this.submit(sender)
      : Promise.reject<TResult>(new OfflineSubmissionError())
  }

  /** Создаёт новый intent после authoritative refetch известного stale исхода. */
  public replaceAfterStale(payload: TPayload) {
    if (this.inFlight !== null) throw new CommandIntentStateError('pending')
    if (this.intentState !== 'stale' || this.envelope === null) {
      throw new CommandIntentStateError(this.intentState)
    }

    this.envelope = createEnvelope(payload, this.createCommandId())
    this.intentState = 'ready'
    return this.envelope
  }

  /** Отменяет дальнейшую отправку при уходе с surface. */
  public abandon() {
    if (this.inFlight !== null) throw new CommandIntentStateError('pending')
    this.intentState = 'abandoned'
    this.envelope = null
  }
}
