# API coverage: Planner Frontend — полный web-пилот

**Версия:** 1.0
**Дата:** 24 августа 2026 года
**Статус:** historical discovery baseline; текущее разрешение gaps — в разделе
2.1
**Backend baseline (historical):** локальный commit
`44f00d00715d6a485ad5aff3f36680a414af96ae`
**OpenAPI baseline (historical):** `Planner API 0.1.0-alpha.0`, 45 paths / 47
operations

## 1. Назначение

Документ связывает пользовательские действия полного web-пилота с публичным
HTTP-контрактом `planner-backend`. У каждого чтения и изменения должен быть один
из двух результатов:

- точная существующая OpenAPI operation;
- именованный `GAP`, который блокирует production-ready сценарий до отдельного
  backend addendum.

Матрица не объявляет внутреннюю application-команду публичным API и не
придумывает окончательные URL или DTO для пробелов. Бизнес-правила, расчёты,
права и lifecycle принадлежат backend PRD. Этот документ отвечает только на
вопрос: может ли отдельный browser client выполнить требуемый job через
зафиксированный HTTP-контракт.

## 2. Граница доказательств

- Baseline подтверждён в локальном checkout `planner-backend`.
- Локальный `main` backend на момент фиксации опережает `origin/main` на восемь
  commits. Это не доказательство наличия контракта в удалённом `main`.
- OpenAPI является committed artifact `docs/api/openapi.json`; runtime endpoint
  для его загрузки не объявлен.
- Backend acceptance, Docker smoke и restore drill не доказывают frontend,
  production deployment, hosted Telegram OIDC или browser smoke.
- Перед началом frontend implementation должен быть выбран опубликованный
  backend SHA и настроен проверяемый способ синхронизации OpenAPI между repos.

### 2.1. Текущее разрешение gaps на 30 августа 2026 года

Frontend consumer закреплён на published backend
`ef76210ad66d442704417addfcf54e7f68cab65d`. Exact OpenAPI SHA-256:
`ed80c89d36296750da11f68f4597a732a8e4e08f82f2e81a6ba8369dd2a9a625`.
Источник истины — `openapi/source.json`; исходные матрицы ниже сохранены как
история discovery, а не как текущая readiness-сводка.

| Gap | Published contract в pinned artifact | Текущее состояние |
| --- | --- | --- |
| `GAP-01` | `GET /workspace/current` | Resolved |
| `GAP-02` | `GET /planning/months` | Resolved |
| `GAP-03` | `POST /planning/drafts/empty` | Resolved |
| `GAP-04` | `POST /planning/drafts/from-publication` | Resolved |
| `GAP-05` | `POST /planning/drafts/{planMonthId}/focus` | Resolved |
| `GAP-06` | `POST /planning/publications/{publicationId}/cancel`; `POST /planning/drafts/{planMonthId}/republish` | Resolved |
| `GAP-07` | `GET /tracking/facts/{factRecordId}/history`; `GET /planning/months/{planMonthId}/history` | Resolved |
| `GAP-08` | `GET /auth/telegram/callback` завершает распознанный terminal outcome через `303` на fixed finite `Location` | Resolved |
| `GAP-09` | `GET /telegram/navigation` | Resolved |
| `GAP-DELIVERY-01` | Exact-byte manifest, sync, generation и drift pipeline в `planner-frontend` | Resolved locally; remote CI is separate evidence |
| `GAP-DEPLOY-01` | Hosted origin/OIDC/session/API smoke | Pending; вне scope M1 |

### 2.2. M3 frontend implementation record на 31 августа 2026 года

M3 реализует `W-02` и create-часть `W-03` поверх published backend
`ef76210ad66d442704417addfcf54e7f68cab65d` и OpenAPI SHA-256
`ed80c89d36296750da11f68f4597a732a8e4e08f82f2e81a6ba8369dd2a9a625`.
`GET /tracking/today` проецируется как server-authoritative
`no_plan/draft/published` read model с own/shared/partner access, fixed/flexible
progress и explicit `Asia/Yekaterinburg`. Create mapping покрывает 8 generated
typed-fact operations; boolean и quantity используют общий `/tracking/facts`:
`POST /tracking/facts`, `/time`, `/rating`, `/checkpoint`, `/text`,
`/checklist-item`, `/or-variant` и `/composite-occurrence`.

Local fixtures в
`src/shared/lib/testing/tracking-fixtures.ts` используют generated DTO types,
request schemas где требуется и `OPENAPI_CONTRACT_SOURCE`; mixed Today и
representative success/validation/network-recovery payloads не проходят
отдельный runtime parse успешного response. Это source/MSW evidence только для frontend mapping,
presentation и recovery. CI, push, PR, hosted backend/runtime и production
authorization/atomicity этим разделом не заявляются.

Playwright и browser automation не запускались по решению пользователя.
Browser acceptance остаётся pending manual user verification и не считается
source evidence.

## 3. Обозначения

| Статус | Значение |
| --- | --- |
| `AVAILABLE` | Job полностью поддержан публичной OpenAPI operation. |
| `PARTIAL` | Основное действие доступно, но заявленное UX-состояние или необходимые метаданные отсутствуют. |
| `GAP` | Публичной operation нет; внутренний command/query не считается доступным frontend. |
| `OPS` | Не пользовательский job, а release/runtime gate. |

## 4. Общие browser-контракты

### 4.1. Сессия и CSRF

- Browser работает с opaque HttpOnly session cookie. Клиент не читает и не
  сохраняет raw session token.
- Все запросы выполняются с cookie текущего origin.
- Перед unsafe-командами frontend получает `GET /auth/csrf` и передаёт токен в
  `X-CSRF-Token`.
- Unsafe-запросы отправляются как exact `application/json` с допустимым
  `Origin`/`Referer`. Даже bodyless logout остаётся JSON-командой.
- Предпочтительная topology — один browser origin с reverse/dev proxy. CORS не
  является частью текущего публичного контракта.

### 4.2. Идемпотентность и числа

- Один пользовательский intent получает UUID `commandId` до первого запроса.
- При неизвестном результате сетевого запроса повтор использует тот же
  `commandId` и тот же payload. Новый intent получает новый ID.
- Revisions, counters, IDs на bigint boundary и exact decimal quantities
  остаются строками. Их нельзя преобразовывать в JavaScript `number`.
- UI показывает success только после подтверждённого server response.

### 4.3. Ошибки и обновление

- Ошибки читаются как RFC 9457 `application/problem+json` с `code`, `requestId`,
  optional `errors`, `conflict` и `blockers`.
- JSON pointers из `errors` связываются с полями формы; неизвестный pointer
  показывается в общей зоне ошибки без потери `requestId`.
- `nextAction` сервера определяет recovery: reload сущности/preview, открытие
  существующей публикации или переход к correction.
- После mutation frontend инвалидирует и повторно читает затронутые read models.
  Realtime между web и Telegram не обещается.
- При offline frontend явно показывает отсутствие сети, не отправляет и не
  ставит команды в очередь. Черновой ввод в открытой форме не считается
  сохранённым.

## 5. Историческая матрица пользовательских jobs

### 5.1. UF-01 — вход, сессия и аккаунт

| Job | Surface | HTTP operation | Статус | Recovery / ограничение |
| --- | --- | --- | --- | --- |
| Определить активную сессию | `W-01`, app shell | `GET /auth/me` | `PARTIAL` | `401` открывает вход; response содержит только `userId/sessionId`, не persona/member profile. |
| Начать Telegram OIDC | `W-01` | `GET /auth/telegram/start` | `AVAILABLE` | Browser следует provider redirect; повторный старт доступен после завершения/ошибки. |
| Завершить Telegram OIDC | `W-01` | `GET /auth/telegram/callback` | `PARTIAL` | Success возвращает `303 /`; ошибки сейчас отдаются Problem Details на callback URL, а не безопасным frontend route. |
| Получить CSRF | app shell | `GET /auth/csrf` | `AVAILABLE` | Повторить после новой сессии; не сохранять между сессиями. |
| Выйти | account menu | `POST /auth/logout` | `AVAILABLE` | После ответа очистить session-dependent cache и открыть `W-01`. |
| Показать «я / партнёр», persona и display name | app shell, `W-02`, `W-10`, `W-13`, `W-14` | — | `GAP-01` | Нельзя выводить из UUID, technical slot или Telegram username. |
| Показать безопасную ошибку OIDC внутри приложения | `W-01` | — | `GAP-08` | Нужен redirect с конечным безопасным error code без PII. |

### 5.2. UF-02 — список планов и создание черновика

| Job | Surface | HTTP operation | Статус | Recovery / ограничение |
| --- | --- | --- | --- | --- |
| Прочитать известный месяц | `W-05`, `W-07` | `GET /tracking/months/{targetMonth}` | `AVAILABLE` | Discriminated state `no_plan/draft/published`; клиент задаёт конкретный месяц. |
| Прочитать активную публикацию | `W-02`, `W-07` | `GET /planning/months/active` | `AVAILABLE` | Не является списком истории и future plans. |
| Найти все доступные месяцы и допустимые источники copy | `W-05`, `W-07`, `W-08`, `W-13` | — | `GAP-02` | Нельзя надёжно угадывать историю перебором дат. |
| Создать первый черновик из April seed | `W-08` | `POST /planning/drafts/from-seed` | `AVAILABLE` | Требует persona selection и CSRF; conflict открывает существующий month state. |
| Создать пустой черновик | `W-08` | — | `GAP-03` | `CreateEmptyDraft` существует только в application layer. |
| Скопировать опубликованный месяц без фактов | `W-08` | — | `GAP-04` | `CreateDraftFromPublication` существует только в application layer. |
| Прочитать созданный draft | `W-09` | `GET /planning/drafts?targetMonth=YYYY-MM` | `AVAILABLE` | `404`/not found возвращает пользователя к актуальному plan state. |

### 5.3. UF-03 — каталог и редактор черновика

| Job | Surface | HTTP operation | Статус | Recovery / ограничение |
| --- | --- | --- | --- | --- |
| Список active/archived целей | `W-12` | `GET /planning/catalog/goal-definitions` | `AVAILABLE` | Фильтр состояния задаётся контрактом. |
| Детали и версии цели | `W-10`, `W-12` | `GET /planning/catalog/goal-definitions/{goalDefinitionId}` | `AVAILABLE` | Missing/foreign identity остаётся concealed. |
| Создать каталожную цель | `W-10`, `W-12` | `POST /planning/catalog/goal-definitions` | `AVAILABLE` | Metadata создаётся отдельно от typed draft config. |
| Добавить новую metadata version | `W-10`, `W-12` | `POST /planning/catalog/goal-definitions/{goalDefinitionId}/versions` | `AVAILABLE` | Stale revision → reload definition. |
| Копировать каталожную цель | `W-12` | `POST /planning/catalog/goal-definitions/{goalDefinitionId}/copy` | `AVAILABLE` | Создаётся новая definition/series по server policy. |
| Архивировать / восстановить | `W-12` | `POST /planning/catalog/goal-definitions/{goalDefinitionId}/archive`, `POST /planning/catalog/goal-definitions/{goalDefinitionId}/restore` | `AVAILABLE` | Не меняет опубликованные snapshots. |
| Изменить фокус месяца | `W-09` | — | `GAP-05` | `UpdateMonthFocus` существует только в application layer. |
| Добавить typed goal в draft | `W-09`, `W-10`, `W-12` | `POST /planning/drafts/{planMonthId}/goals` | `AVAILABLE` | Использовать текущую revision; validation errors принадлежат полям. |
| Изменить typed goal | `W-10` | `POST /planning/drafts/{planMonthId}/goals/{planGoalId}/update` | `AVAILABLE` | Stale draft → refetch и повтор осознанного выбора. |
| Удалить goal только из draft | `W-09` | `POST /planning/drafts/{planMonthId}/goals/{planGoalId}/remove` | `AVAILABLE` | Не архивирует catalog definition. |
| Изменить порядок | `W-09` | `POST /planning/drafts/{planMonthId}/goals/reorder` | `AVAILABLE` | Отправляется полный актуальный ordered ID set. |
| Выбрать владельца personal goal понятным именем | `W-10` | — | `GAP-01` | Current DTO требует member identity; UUID нельзя хардкодить. |

### 5.4. UF-04 — preview и публикация

| Job | Surface | HTTP operation | Статус | Recovery / ограничение |
| --- | --- | --- | --- | --- |
| Построить deterministic preview | `W-11` | `GET /planning/drafts/publication-preview?targetMonth=YYYY-MM` | `AVAILABLE` | Blockers являются `200` data; preview связан с revision/date/hash. |
| Опубликовать exact preview | `W-11` | `POST /planning/drafts/{planMonthId}/publish` | `AVAILABLE` | Stale/hash mismatch → reload preview; already published → открыть existing publication. |
| Прочитать immutable snapshot | `W-07`, `W-11` | `GET /planning/publications/{publicationId}` | `AVAILABLE` | Read-only после публикации. |
| Вернуть future publication в draft | `W-07` | — | `GAP-06` | `CancelPublication` существует только в application layer; backend проверяет start/facts. |
| Повторно опубликовать исправленный future draft | `W-11` | — | `GAP-06` | `RepublishMonth` существует только в application layer и создаёт новую revision. |

### 5.5. UF-05 — «Сегодня», ввод и исправление

| Job | Surface | HTTP operation | Статус | Recovery / ограничение |
| --- | --- | --- | --- | --- |
| Прочитать Today | `W-02` | `GET /tracking/today` | `AVAILABLE` | Возвращает `no_plan/draft/published`, viewer access, writable flags и progress. |
| Boolean / quantity add/latest / informational quantity | `W-03` | `POST /tracking/facts` | `AVAILABLE` | Existing fact может направить к correction; add retry использует тот же command ID. |
| Actual time | `W-03` | `POST /tracking/facts/time` | `AVAILABLE` | Target date и local time не выводятся из browser timezone. |
| Rating | `W-03` | `POST /tracking/facts/rating` | `AVAILABLE` | Низкая оценка не превращается UI в «провал» без server state. |
| Scalar checkpoint | `W-03` | `POST /tracking/facts/checkpoint` | `AVAILABLE` | Учитывать stable component ID. |
| Text | `W-03` | `POST /tracking/facts/text` | `AVAILABLE` | Непустой text и result отправляются по DTO. |
| Checklist item | `W-03` | `POST /tracking/facts/checklist-item` | `AVAILABLE` | Partial state читается заново после mutation. |
| OR variant | `W-03` | `POST /tracking/facts/or-variant` | `AVAILABLE` | Не суммировать варианты на клиенте. |
| Flexible checklist/OR occurrence | `W-03` | `POST /tracking/facts/composite-occurrence` | `AVAILABLE` | Evaluation остаётся server-owned. |
| Исправить факт | `W-03`, `W-06` | `POST /tracking/facts/{factRecordId}/correct` | `AVAILABLE` | Любая correction требует непустую причину; shared дополнительно проверяет права; stale revision → refetch. |
| Удалить personal факт | `W-03`, `W-06` | `POST /tracking/facts/{factRecordId}/delete` | `AVAILABLE` | Непустая причина обязательна; shared delete запрещён; tombstone не равен physical deletion. |
| Отменить последнее собственное действие | `W-02`, `W-06` | `POST /tracking/facts/{factRecordId}/undo` | `AVAILABLE` | `nothing_to_undo/not_latest/superseded` → reload tracking state. |
| Показать полный audit chain исправления | `W-06` | — | `GAP-07` | Текущий read model отдаёт current fact/revision/actor, но не old/new/reason/history. |

### 5.6. UF-06 — календарь и детали дня

| Job | Surface | HTTP operation | Статус | Recovery / ограничение |
| --- | --- | --- | --- | --- |
| Прочитать месяц, календарь и дни | `W-05` | `GET /tracking/months/{targetMonth}` | `AVAILABLE` | UI не пересчитывает `done/not_done/no_data/not_applicable`. |
| Открыть записи выбранного дня | `W-06` | `GET /tracking/months/{targetMonth}` | `AVAILABLE` | Клиент выбирает день из server read model; future/closed/writable определяет сервер. |
| Переключить доступный месяц | `W-05` | `GET /tracking/months/{targetMonth}` | `PARTIAL` | Конкретный месяц читается, но список существующих месяцев требует `GAP-02`. |
| Показать авторов понятными именами | `W-06` | — | `GAP-01` | Текущий read model содержит member IDs без profile mapping. |
| Показать историю исправлений | `W-06` | — | `GAP-07` | Current value доступно, полный аудит — нет. |

### 5.7. UF-07 — закрытие дня, weekly task и уведомления

| Job | Surface | HTTP operation | Статус | Recovery / ограничение |
| --- | --- | --- | --- | --- |
| Preview CloseDay | `W-04` | `GET /tracking/publications/{publicationId}/days/{localDate}/close-preview` | `AVAILABLE` | Preview actor-relative и revision-bound. |
| Подтвердить CloseDay | `W-04` | `POST /tracking/publications/{publicationId}/days/{localDate}/close` | `AVAILABLE` | Race → reload preview; existing close → открыть закрытый день. |
| Записать weekly planned task result | `W-02`, `W-06` | `POST /tracking/publications/{publicationId}/weekly-tasks/{flexiblePeriodId}/result` | `AVAILABLE` | Correction использует общий fact maintenance flow. |
| Прочитать личные reminder settings | `W-14` | `GET /reminders/settings` | `AVAILABLE` | Partner settings не должны становиться editable. |
| Сохранить reminder settings | `W-14` | `POST /reminders/settings` | `AVAILABLE` | Revision conflict → reload settings and retry. |
| Прочитать delivery status | `W-14` | `GET /reminders/delivery-status` | `AVAILABLE` | `blocked/connection_lost` не блокирует web tracking. |
| Открыть корректный bot deep-link и показать stable identity | `W-01`, `W-14` | — | `GAP-09` | Bot username/link и безопасные account metadata отсутствуют в response. |

### 5.8. UF-08 — отчёт, grace, reopen/reclose и следующий месяц

| Job | Surface | HTTP operation | Статус | Recovery / ограничение |
| --- | --- | --- | --- | --- |
| Прочитать pilot report | `W-13` | `GET /reporting/months/{targetMonth}` | `AVAILABLE` | Сервер отдаёт current/preliminary/closed/revised, три sections и series. |
| Связать personal sections с именами | `W-13` | — | `GAP-01` | Report содержит `ownerMemberId`, но нет публичного profile mapping. |
| Открыть closed month с причиной | `W-15` | `POST /planning/months/{planMonthId}/reopen` | `AVAILABLE` | `not_closed/already_reopened` → reload month. |
| Повторно закрыть reopened month | `W-13` | `POST /planning/months/{planMonthId}/reclose` | `AVAILABLE` | Stale revision/status/mode → reload month/report. |
| Показать историю lifecycle и причин | `W-07`, `W-13`, `W-15` | — | `GAP-07` | Current lifecycle/report revision доступны, но нет bounded timeline publish/cancel/reopen/reclose с actor, reason и переходами status/revision. |
| Создать следующий месяц из прошлого | `W-08` | — | `GAP-02` + `GAP-04` | Нужны discovery источника и публичная copy command. |

## 6. Исторический реестр backend gaps

### GAP-01 — Workspace/member bootstrap

**Нужно для:** app shell, `W-02`, `W-03`, `W-06`, `W-10`, `W-13`, `W-14`.

Минимальная capability должна позволять authenticated browser получить:

- current `userId/memberId` и persona/display label;
- второго member с persona/display label;
- один `spaceId` и неизменяемый timezone продукта;
- только безопасные presentation metadata, без raw Telegram ID и без прав,
  выведенных из technical membership slot.

**Acceptance:** frontend различает «я / партнёр / shared», формирует owner selection
и подписывает report sections без hardcoded UUID.

### GAP-02 — Plan/month discovery

**Нужно для:** `W-05`, `W-07`, `W-08`, `W-13`.

Capability возвращает ограниченный список доступных месяцев с lifecycle/mode,
наличием draft/publication/report и допустимостью использования publication как
copy source. Она не должна требовать browser-перебора произвольных дат.

**Acceptance:** current, next и исторические месяцы отображаются из одного
authoritative read model; foreign space не раскрывается.

### GAP-03 — Create empty draft HTTP command

Публичная browser command поверх существующей `CreateEmptyDraft`, с
`commandId`, actor from session, exact focus/target month и finite problems.

**Acceptance:** оба member могут создать один empty draft; replay стабилен;
conflict открывает существующий month state.

### GAP-04 — Create draft from publication HTTP command

Публичная browser command поверх `CreateDraftFromPublication` без копирования
facts, statuses, notes, reports, notifications или progress.

**Acceptance:** source остаётся immutable; destination создаётся один раз;
frontend получает destination reference и открывает editor.

### GAP-05 — Update month focus HTTP command

Публичная draft-only command поверх `UpdateMonthFocus` с expected revision.

**Acceptance:** изменение увеличивает draft revision; stale change не
перезаписывает подтверждённый focus; published month остаётся immutable.

### GAP-06 — Cancel and republish HTTP commands

Публичные команды поверх `CancelPublication`/`RepublishMonth` с server-owned
проверками start date, facts, revisions и append-only publication history.

**Acceptance:** future plan без facts возвращается в draft; started/factual plan
не меняется; republish создаёт следующую immutable publication revision.

### GAP-07 — Fact and lifecycle audit history read model

Bounded read models для доступных пользователю сущностей:

- для факта — original actor, last editor, timestamps, correction/delete reason,
  old/new revision chain и tombstone/compensation events;
- для месяца/publication/report — publish/cancel/reopen/reclose actor и reason,
  timestamps, old/new lifecycle status, mode и revision references.

**Acceptance:** `W-06` показывает историю доступного факта, а `W-07/W-13/W-15`
показывают bounded lifecycle timeline; personal/shared/workspace read rights и
PII-safe serialization соблюдаются.

### GAP-08 — Frontend-safe OIDC failure redirect

Callback failure должен завершаться redirect на фиксированную frontend surface
с конечным безопасным error code либо эквивалентным browser-readable ceremony
result. Raw provider details, tokens, Telegram IDs и state не попадают в URL.

**Acceptance:** cancel, state mismatch, provider outage и access denial видимы в
`W-01`; повтор входа начинает новую ceremony.

### GAP-09 — Bot navigation and account metadata

Authenticated capability отдаёт конфигурируемый безопасный bot deep-link и
достаточный display status для `W-01/W-14`; username не используется как
identity key.

**Acceptance:** пользователь открывает правильный private bot chat без
hardcoded frontend URL; `blocked/connection_lost` остаются из delivery status.

## 7. Delivery gaps

### GAP-DELIVERY-01 — Межрепозиторная фиксация OpenAPI

До code generation/implementation выбрать один воспроизводимый механизм:
published backend artifact at pinned SHA, release artifact или иной проверяемый
contract handoff. Copy-paste без drift check недопустим.

### GAP-DEPLOY-01 — Hosted browser gate

До месяца без бумаги должны быть доказаны production origin/proxy, HTTPS,
Telegram Allowed URLs/OIDC callback, session cookie, CSRF, API + worker runtime,
backup/restore и hosted smoke без PII leakage.

## 8. Применение Problem Details

| Состояние | UI-реакция |
| --- | --- |
| `401 AUTHENTICATION_REQUIRED` | Не считать intent успешным; очистить session cache, открыть `W-01`, после входа перечитать server state. |
| `403 AUTHORIZATION_DENIED` | Показать read-only/forbidden reason без раскрытия чужой сущности. |
| `409`/conflict с `nextAction` | Выполнить указанное reload/open/correct действие; не делать blind overwrite. |
| `422` + `errors[]` | Связать известные pointers с полями, остальные показать в общей зоне. |
| Publication blockers | Показать все blockers в deterministic порядке и переход к затронутой цели. |
| `503 DEPENDENCY_UNAVAILABLE` | Сохранить форму как неподтверждённый локальный ввод, дать безопасно повторить тот же intent. |
| Network timeout | Результат неизвестен; повторить тот же payload с тем же `commandId`, затем refetch. |
| Offline | Не отправлять и не ставить intent в очередь; показать явное online-only состояние. |

## 9. Acceptance матрицы

Документ готов к backend addendum и frontend technical design, когда:

1. каждый `UF-01…UF-08` имеет все reads и mutations в таблицах выше;
2. каждый `W-01…W-15` связан хотя бы с одной operation или именованным gap;
3. ни одна application-команда не названа доступной без controller/OpenAPI;
4. все goal input types связаны с точным tracking endpoint;
5. session, CSRF, idempotency, string-number и Problem Details правила едины;
6. no-realtime и online-only ограничения явно отражены в UX;
7. backend addendum закрывает `GAP-01…GAP-09`, не меняя frontend business policy;
8. published backend SHA и OpenAPI handoff подтверждены отдельно от локального
   frontend commit и hosted deployment.

## Приложение A. Исходный OpenAPI inventory на 24 августа 2026 года

### Auth

- `GET /auth/me`
- `GET /auth/csrf`
- `POST /auth/logout`
- `GET /auth/telegram/start`
- `GET /auth/telegram/callback`

### Planning

- семь catalog operations: list, detail, create, version, archive, restore, copy;
- `GET /planning/drafts`;
- `POST /planning/drafts/from-seed`;
- `GET /planning/drafts/publication-preview`;
- add/update/remove/reorder draft goal;
- publish draft;
- read active month and immutable publication;
- reopen/reclose month.

### Tracking, reminders и reporting

- `GET /tracking/today`, `GET /tracking/months/{targetMonth}`;
- восемь typed fact create operations;
- correct/delete/undo;
- CloseDay preview/confirm и weekly-task result;
- reminder settings read/write и delivery status;
- pilot monthly report.

Health operations (`live/startup/ready`) являются runtime/operations contract и
не используются как пользовательские экраны.
