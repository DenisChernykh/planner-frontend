# План реализации Planner Frontend — полный web-пилот

**Версия:** 1.1
**Дата:** 24 августа 2026 года
**Статус:** `G0` принят; `M1` foundation и `M2` Auth/AppShell завершены
локально; published backend handoff `F10` закреплён consumer
manifest/generated output
**Гранулярность:** девять крупных задач `M1…M9`

## 1. Назначение и источники

План переводит согласованный полный web-пилот в последовательность крупных
результатов. Он опирается на:

- [PRD](./PRD.md);
- [user flows](./USER_FLOWS.md) `UF-01…UF-08`;
- [карту экранов](./SCREEN_MAP.md) `W-01…W-15`;
- [API coverage](./API_COVERAGE.md) и gaps `GAP-01…GAP-09`;
- [технический дизайн](./TECHNICAL_DESIGN.md) и backend gates `F01…F10`.

`M` означает крупную задачу, а не один commit. Перед реализацией каждая `M`
может быть разложена на небольшие исполняемые cards и отдельные commits, но её
scope и acceptance gate не должны размываться.

План не является разрешением на push, PR, merge, deployment или изменение
инфраструктуры. Эти действия получают отдельную авторизацию.

## 2. Наблюдаемое исходное состояние на 24 августа 2026 года

Состояние ниже — исторический baseline до начала реализации, а не текущая
readiness-сводка. Оно проверено перед созданием этого плана; актуальный handoff
зафиксирован в `openapi/source.json` и разделе 2 технического дизайна.

| Репозиторий                 | Наблюдение                                                                                                                               | Следствие                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `planner-frontend`          | `main=origin/main=9eb6e29`; tracked только четыре продуктовых документа; `TECHNICAL_DESIGN.md` и `IMPLEMENTATION_PLAN.md` пока untracked | Код и toolchain отсутствуют; согласованные документы ещё не являются опубликованным repository baseline          |
| `planner-backend`           | local `main=0ef4f0d`, ahead `origin/main=cf76080` на 2 commits; working tree содержит незавершённый `F02` WIP                            | `F01` реализован локально, но ещё не является published consumer contract; dirty `F02` нельзя потреблять как pin |
| Backend plan                | `F01` checked; `F02…F10` unchecked                                                                                                       | Полный web-пилот нельзя принять по текущему опубликованному API                                                  |
| Dirty local backend OpenAPI | 47 paths, 49 operations; SHA-256 `cf6618400b7660701d2c95104181639b184ad6ea5502824ac95d8deb8f023320`                                      | Это изменяемый `F02` WIP artifact, не frontend pin                                                               |
| `react-starter`             | clean `stage=origin/stage=258b4e0`                                                                                                       | Read-only источник foundation-механизмов                                                                         |

Технический дизайн синхронизирован с этим point-in-time provenance при принятии
`G0`. Перед каждой реализационной задачей refs, dirty state и фактически
resolved версии перепроверяются; dirty backend artifact не становится pin.

## 3. Обязательные правила выполнения

1. Backend остаётся единственным владельцем identity, authorization, calendar,
   lifecycle, allowed actions, scoring, reminders и reports.
2. GAP-dependent feature не считается готовой по mock, guessed DTO,
   application command без controller/OpenAPI или unpublished sibling checkout.
3. Foundation можно реализовывать до финального `F10`; конкретная feature может
   интегрироваться сразу после публикации и pin нужной операции.
4. Успешный response перед записью в Query cache доверяется generated
   TypeScript return type и возвращается как `response.data`; frontend не
   выполняет runtime validation успешного payload. Контракт обеспечивают
   pinned OpenAPI и backend contract/CI; error handling сохраняется.
5. Decimal, revision, bigint, date и time сохраняются lossless strings на
   transport/model boundary.
6. Mutation не имеет optimistic domain success. Unknown outcome повторяет exact
   payload с тем же `commandId`; stale state требует refetch и нового intent.
7. Mobile и desktop имеют одинаковые data, actions, permissions и recovery.
8. `pnpm check`, local browser, hosted smoke и фактический месячный пилот —
   четыре разных уровня доказательств.
9. Для `M2…M9` действует `reuse-first`: перед реализацией generic-механизма
   сверить его с exact `react-starter` baseline из технического дизайна;
   совместимый механизм перенести осознанным diff и адаптировать к pinned
   Planner contracts, новый создавать только при отсутствии совместимого
   варианта. В PR фиксируются source SHA, reused/adapted scope и исключения, а
   acceptance заново доказывается в Planner.

## 4. Подготовительные gates вне frontend milestones

### G0 — Baseline-решения приняты

**Статус:** `ACCEPTED` 24 августа 2026 года.

Приняты следующие решения:

- `TECHNICAL_DESIGN.md` и этот план являются согласованным baseline; Git/remote
  публикация остаётся отдельным действием;
- manifest specifiers переносятся из exact `react-starter@258b4e0`, а реально
  установленные версии определяются перенесённым lockfile без bootstrap-update;
- OpenAPI checksum считается по exact published backend bytes; snapshot
  копируется byte-for-byte без нормализации trailing newline;
- успешные responses доверяются generated TypeScript return types; runtime
  schema parsing успешных payloads на frontend не выполняется;
- любой terminal OIDC callback failure завершается safe frontend result route;
  finite result enum генерируется из published `F08`, raw Problem не является
  конечным browser UX;
- `returnTo` сохраняет только validated protected `pathname`, без query/hash;
- route ownership нормативен: `/api/*` и exact OIDC `start/callback` принадлежат
  backend, `/auth/telegram/result` и остальные SPA routes — frontend;
- GitHub CI обязан запускать тот же `pnpm check`, что и local source gate;
- MSW fixtures typed, связаны с exact OpenAPI revision и доказывают только
  frontend request/presentation/recovery, а не backend policy.

`G0` закрыт; `M1` готов к исполнению независимо от финального `F10`.

### B0 — Вести backend contract runway параллельно frontend

**Статус:** `LOCAL COMPLETE`; published backend `ef76210` закреплён текущим
frontend F10 repin, local source gate и independent cross-repository review
пройдены. Frontend push/remote CI и hosted runtime остаются separate evidence.

`B0` исполняется в `planner-backend` по существующим cards `F01…F10` и не
считается frontend milestone.

- опубликовать и проверить финальный `F01`;
- закрывать `F02…F09` по одному и публиковать exact OpenAPI operations;
- разрешать frontend pin каждой готовой capability до финального handoff;
- менять staged `required-operations` только reviewable versioned diff: запретить
  silent removal, но разрешать осознанную замену path/operationId до `F10`;
- выполнить `F10` только после `F01…F09` и после появления в `M1`
  воспроизводимого frontend sync/generate/check pipeline;
- отдельно фиксировать backend tests, published Git ref, frontend regeneration
  и hosted evidence.

`B0` завершён, когда опубликован точный backend SHA со всеми `F01…F09`, clean
frontend sync воспроизводит pinned snapshot/generated output, а независимый
cross-repository review принимает `F10`.

## 5. Зависимости и параллельность

```text
G0 ─→ M1 Foundation ─→ M2 Auth/AppShell ─┬→ M3 Daily core ─→ M6 Day/Ops ─┐
                                         ├→ M4 Planning ─→ M5 Publish ───┤
                                         ├→ M7 Reminders ────────────────┤
                                         └→ M8 Report (fixtures first) ──┤
                                                                          ├→ M9 RC
B0 F01…F09 ── capability pins ───────────────→ M2…M8                     │
B0 F10 (depends on M1 pipeline) ─────────────────────────────────────────┘

M9 RC ─→ D0 hosted delivery plan ─→ P0 month pilot evaluation
```

- `B0` и `M1` можно начинать параллельно после `G0`.
- После `M2` задачи `M3`, `M4`, `M7` и начальная report presentation `M8`
  могут идти параллельно на typed fixtures.
- Принять GAP-dependent часть можно только на published pinned operation.
- Полный daily E2E требует опубликованного месяца из `M5`; core `M3` — нет.
- `M8` не зависит от reminder/settings UI `M7`, но полный `UF-08` связывается с
  planning/tracking в `M9`.

## 6. Крупные frontend-задачи

### M1 — Перенести frontend foundation и transport platform

**Статус:** `LOCAL COMPLETE` 30 августа 2026 года; foundation и первые review
fixes merged в `origin/main@59e8c08`, corrective F10 repin `5e30072` и финальный
review fix опубликованы в `origin/feat/m1-frontend-foundation@2a287ea`, но ещё
не merged в `main`. Exact local checkout прошёл byte-for-byte `api:sync`,
`pnpm check` (24 test files / 208 tests), production build и Vite HTTP smoke;
второй независимый review не нашёл замечаний. Acceptance commit, corrected
remote CI и hosted runtime являются отдельным evidence.
**Зависимости:** `react-starter@258b4e0`, staged contract policy из `G0/B0`.

**В scope:**

- перед dependency-changing операциями проверить `.nvmrc`, `engines`,
  `packageManager`, `node --version` и `pnpm --version`;
- перенести toolchain и механизмы starter без его Git history и product modules;
- настроить React/Vite/TypeScript, FSD/Steiger, ESLint, Prettier, Vitest и build;
- создать `.github/workflows` source-check с repository Node/pnpm contract,
  clean install и тем же обязательным `pnpm check`, что запускается локально;
- создать AppProvider, RouterProvider, единый QueryClient и route error boundary;
- реализовать same-origin `/api` transport interface, Axios credentials,
  in-memory CSRF и AbortSignal;
- добавить route-table tests: `/api/*` strip prefix, exact OIDC start/callback
  принадлежат backend, `/auth/telegram/result` всегда принадлежит SPA;
- реализовать OpenAPI pin/sync/generate/check, Orval TypeScript + Zod output и
  curated API exports;
- добавить безопасный Problem Details parser и нормализацию network/abort;
- реализовать command-intent, lossless date/time/decimal/revision helpers;
- перенести MSW/testing foundation, `useZodForm` и минимальные shared UI
  primitives;
- привязать fixtures к exact OpenAPI revision и generated DTO types; request/body
  и error schemas использовать только там, где это нужно их boundary;
- создать semantic tokens, typography и responsive layout primitives без
  копирования starter product styling.

**Готово, когда:**

- минимальное приложение стартует и production build собирается;
- `pnpm check` проходит на clean checkout с текущим staged manifest;
- source-check workflow существует, не задаёт конфликтующую версию pnpm и
  запускает тот же gate на GitHub;
- generated drift, включая untracked output, обнаруживается автоматически;
- transport tests покрывают session cookie, CSRF, Problem/protocol/network,
  typed success/cache behavior, abort, duplicate submit, stale и unknown
  outcome;
- pending/unknown navigation и full reload не приводят к позднему auto-send:
  после reload выполняется authoritative refetch;
- в коде нет password/admin/approval product modules из starter.

### M2 — Реализовать Telegram auth, session, workspace и AppShell

**Статус:** `LOCAL COMPLETE` 30 августа 2026 года. Session/cache/CSRF,
protected router boundaries, Sidebar/Sheet и AppShell опираются на exact
read-only `react-starter@258b4e0`; в Planner адаптированы Telegram OIDC,
published DTO/invariants, route table, root resolver, reconnect и privacy
границы. Exact local checkout прошёл `pnpm check`, три независимых code review
и mock-backed Playwright smoke на desktop/mobile viewport: login/finite result,
sanitized deep link, AppShell/focus, offline/reconnect и logout. Реальные
Chrome/macOS и Safari/iPhone manual evidence, hosted backend/OIDC smoke,
frontend push/remote CI/PR/deployment остаются отдельными доказательствами.

**Трассировка:** `UF-01`, `W-01`, account-часть `W-14`, `FE-AC-01…03`.
**Зависимости:** `M1`; published pins `F01` и `F08`; `F09` для bot link.

**В scope:**

- login и finite-result страницы Telegram OIDC;
- fresh `/auth/me` protected loader и очистка cache/CSRF только при
  `AUTHENTICATION_REQUIRED` или явном logout;
- одноразовый safe `returnTo` для full-page ceremony: только validated protected
  `pathname`, без query/hash, token, PII, form data или `commandId`;
- WorkspaceGate с current/partner/shared labels только из backend;
- root resolver `Today / Plans / Statistics` по authoritative server state;
- AppShell с четырьмя primary destinations, account menu и settings route;
- desktop sidebar, mobile Sheet, один `<main>`, keyboard/focus semantics;
- persistent online-only banner, reconnect refetch и отсутствие auto-submit;
- logout, session expiry, provider/cancel/allowlist/dependency recovery;
- безопасная bot navigation metadata после публикации `F09`.

**Готово, когда:**

- anonymous deep links, active/expired session и все finite OIDC outcomes
  проходят router/component tests;
- UUID, membership slot, raw Problem detail и Telegram identifiers не попадают
  в presentation, storage или diagnostics;
- root resolver и все четыре destinations работают после reload;
- mobile/desktop, keyboard и screen-reader path дают одинаковый результат.

После `M2` выполняется промежуточная browser/visual/a11y проверка login,
callback, AppShell и deep links на mobile/desktop; дефекты оболочки не
откладываются до финального `M9`.

### M3 — Реализовать ранний Today и typed fact core

**Статус:** `LOCAL SOURCE COMPLETE` 31 августа 2026 года: Today read model,
8 generated typed-fact operations; boolean и quantity используют общий
`/tracking/facts`; intent recovery и OpenAPI-bound MSW
fixtures реализованы на pinned backend
`ef76210ad66d442704417addfcf54e7f68cab65d` с SHA-256
`ed80c89d36296750da11f68f4597a732a8e4e08f82f2e81a6ba8369dd2a9a625`.
Локальные targeted и полный `pnpm test` (53 test files / 414 tests), formatter,
lint, Steiger, TypeScript и Vite build gates пройдены; полный локальный
`pnpm check` (api drift, format, lint, Steiger, tests и build) PASS. CI, push,
PR, merge и deployment этим статусом не заявляются.

**Трассировка:** core `UF-05`, `W-02`, create-часть `W-03`, `FE-AC-08`.
**Зависимости:** `M2`; published `F01` и существующие Today/fact operations.
`F02`, `F07`, planning UI и `M5` не блокируют этот core.

**В scope:**

- Today с own personal, partner read-only, shared, fixed, flexible и weekly
  state на заранее опубликованном backend fixture;
- все create families: boolean/quantity/time/rating/checkpoint/text/checklist/
  OR/composite;
- exact generated DTO mapping; успешные responses доверяются generated
  TypeScript return types без frontend runtime validation;
- lossless decimal/date/time/revision values и explicit
  `Asia/Yekaterinburg`;
- pending, confirmed, replay, stale, unknown outcome и offline behavior;
- scoped refetch после собственной mutation;
- общий freshness policy без realtime: refetch при route navigation, явном
  refresh, reconnect и для выбранных live entities при browser focus;
- stale badge/read-only presentation, пока authoritative refresh не завершён.

**Фактическая local acceptance M3:**

- `entities/tracking` оставляет `no_plan/draft/published`, server ordering,
  `viewerAccess`, `writable`, `applicable`, progress/coverage и
  `Asia/Yekaterinburg` authoritative; `/today` сохраняет session-first
  navigation refresh, manual refresh, focus/reconnect policy и stale/offline
  read-only presentation;
- `features/record-fact` маршрутизирует boolean/quantity через
  `/tracking/facts`, а actual time, rating, scalar checkpoint, text, checklist
  item, OR variant и composite occurrence через их generated operations. Request
  mapping использует generated body schemas в пределах текущего scope, а
  успешные responses доверяются generated TypeScript; decimal/date/time/revision
  остаются строками, rating — generated number;
- `src/shared/lib/testing/tracking-fixtures.ts` содержит mixed Today с
  personal/shared/partner read-only goals, fixed/flexible progress, typed
  success/validation/recovery fixtures и MSW handlers. Payloads типизированы
  generated DTO и связаны с `OPENAPI_CONTRACT_SOURCE`; runtime parse успешных
  response fixtures не выполняется;
- reused mechanisms: Planner-owned `CommandIntentController`, `useZodForm`,
  generated TypeScript/request contracts и MSW foundation. Из
  `react-starter@258b4e0` адаптированы только generic UI/form/error mechanisms;
  product semantics, permissions, routes, query ownership и command intent
  остаются Planner-owned;
- correction/delete/undo, CloseDay, weekly-result mutation, Month/Day UI,
  M4–M9 и backend/OpenAPI changes не входят в M3;
- Playwright и browser automation по решению пользователя не запускались.
  Browser acceptance остаётся `PENDING MANUAL USER VERIFICATION` и не является
  source evidence. Local fixtures/MSW доказывают только frontend mapping,
  presentation и recovery, но не backend authorization, atomicity, persistence
  или hosted runtime.

**Готово, когда:**

- все typed create operations работают на phone и desktop без client scoring;
- partner write недоступна, а shared/own actions следуют server access;
- unknown retry сохраняет exact payload/`commandId`, а reload не отправляет его
  автоматически;
- изменение партнёра становится видимо после navigation/focus/manual refresh;
- component/router tests и промежуточная mobile/desktop browser-проверка
  покрывают Today mixed state и representative typed inputs.

### M4 — Реализовать список планов, создание месяца, каталог и draft editor

**Трассировка:** `UF-02`, `UF-03`, `W-07…W-10`, `W-12`,
`FE-AC-04…05`.
**Зависимости:** `M1`, `M2`; published pins `F01…F05`. Может идти параллельно
`M3`.

**В scope:**

- authoritative index current/future/history months и allowed actions;
- создание ровно одного draft из seed, empty или прошлой publication;
- persona/owner selection по backend mapping, без UUID/array-order inference;
- обязательный focus при empty creation и revision-guarded focus update;
- catalog list/detail/create/version/copy/archive/restore;
- attach/remove/reorder goals без drag-only управления;
- полные conditional forms для всех goal families и repetition variants;
- owner/scope, measurement, target, unit, precision, aggregation, checkpoints,
  checklist и OR configuration;
- form pointer allowlists, blockers, unsaved-route protection, stale refetch и
  явное повторное решение;
- полный responsive parity: planning desktop-first, но не урезанный на mobile.

**Готово, когда:**

- `UF-02/UF-03` проходят на seed/empty/copy и conflict/replay scenarios;
- frontend отправляет exact copy DTO и показывает только подтверждённый
  destination state; отсутствие скрытого переноса facts/statuses/reports/
  reminders/progress доказывается backend `F04` и cross-repo integration;
- каждая допустимая family/repetition строит exact generated DTO без скрытых
  irrelevant fields;
- partner/shared rights и catalog history отображаются без клиентской policy;
- blockers ведут к точному полю или остаются в safe summary.

После `M4` выполняется промежуточная browser/visual/a11y проверка Plans index,
create plan, representative goal forms, draft editor и catalog на
mobile/desktop.

### M5 — Реализовать preview, publish, cancel и republish

**Трассировка:** `UF-04`, `W-11`, publication states `W-07`,
`FE-AC-06…07`, `FE-AC-14`.
**Зависимости:** `M4`; existing preview/publish contract и published `F06`.

**В scope:**

- revision-bound deterministic preview и полный список blockers;
- отображение calculated targets, late/scheduled activation, provenance,
  schema/formula versions и snapshot hash marker;
- explicit publish exact preview без optimistic activation;
- immutable publication read/cache и маршрутизация active/future result;
- future cancel только по server-owned start/facts/lifecycle rules;
- republish с новой append-only publication revision;
- stale/hash mismatch, exact replay, fingerprint conflict, parallel publish и
  unknown network outcome recovery.

**Готово, когда:**

- frontend подтверждает только актуальный preview и трактует exact replay как
  исходный result; отсутствие второй backend revision доказывает publish E2E;
- UI не показывает допустимый cancel для server-denied started/factual state и
  после ответа делает refetch; фактическую неизменность данных доказывает
  backend `F06`;
- UI показывает old/new publication references после republish; сохранность
  immutable snapshot и append-only revision доказывает backend `F06`;
- retry unknown intent использует тот же payload/`commandId`, а stale
  reconfirmation — новый intent;
- active result открывает daily loop, future result остаётся в Plans.

После `M5` вручную проверяются blockers, scheduled/late preview, publish,
cancel/republish и unknown/stale recovery минимум в одном desktop и одном
mobile viewport.

### M6 — Реализовать месяц, детали дня, maintenance, CloseDay и weekly task

**Трассировка:** maintenance `UF-05`, `UF-06`, operational часть `UF-07`,
`W-03…W-06`, `FE-AC-09…11`.
**Зависимости:** `M3`; published `F02`, `F07` и существующие month,
maintenance, CloseDay и weekly operations. `M5` нужен только для полного пути
«создать → опубликовать → вести», но не для разработки на authoritative fixture.

**В scope:**

- month index/selector, calendar read model и выбранный day detail;
- lifecycle fixtures: `no_plan`, `draft`, future/active `published`, ordinary и
  reopened `grace`, `closed/revised`, future day, closed day и read-only;
- точное различение `done`, `not_done`, `no_data`, `not_applicable`, partial,
  informational и `N/A`;
- correction с непустой причиной, personal delete с непустой причиной, own
  undo и bounded audit history;
- partner write и shared delete blocked presentation;
- owner/editor/system labels из workspace/history contracts;
- actual-time range через полночь с explicit expectation date;
- CloseDay preview и отдельное exact confirmation;
- weekly planned task result через server operation;
- route/focus/manual refresh policy из `M3` для calendar/day/history;
- stale/conflict/duplicate/unknown/offline/read-only recovery.

**Готово, когда:**

- calendar/day UI принимает всю lifecycle-матрицу и показывает только
  server-allowed actions;
- correction/delete forms валидируют непустую reason, а refetch показывает
  новую revision и audit chain;
- frontend отправляет exact CloseDay preview confirmation и отображает
  authoritative refetch; какие именно rows изменены, доказывает backend E2E;
- flexible/weekly presentation не приписывает локальный daily failure;
- изменение партнёра видно после navigation/focus/manual refresh;
- промежуточная mobile/desktop browser-проверка покрывает calendar states,
  maintenance, CloseDay и weekly task.

### M7 — Реализовать reminders и Telegram settings

**Трассировка:** settings-часть `UF-01`, reminder-часть `UF-07`, `W-14`,
`FE-AC-12`.
**Зависимости:** `M2`; published `F09` и существующие reminder settings/status
operations. Может идти параллельно `M3…M6`.

**В scope:**

- personal `morning/day/evening` slots с независимым отключением;
- visible immutable timezone `Asia/Yekaterinburg`;
- delivery states `available`, `blocked`, `connection_lost`;
- server-provided bot link, re-login и logout entrypoints;
- stale settings revision, exact replay, unknown result и reconnect recovery;
- недоступная Telegram delivery не блокирует web tracking.

**Готово, когда:**

- настройки партнёра не читаются как editable current-member state;
- сохранённые slots и revision подтверждены backend response/refetch;
- bot URL не хардкодится и не используется как identity/delivery-health key;
- blocked/connection_lost имеют recovery, но daily controls остаются доступны.

### M8 — Реализовать отчёт, lifecycle и создание следующего месяца

**Трассировка:** `UF-08`, `W-13`, `W-15`, `FE-AC-13`.
**Зависимости:** `M2`; published `F02`, `F03`, `F04`, `F07` и существующие
report/reopen/reclose operations. Presentation может начаться на authoritative
fixtures параллельно `M3…M7`; полная `UF-08` acceptance связывается с `M4…M6`.

**В scope:**

- month selection и report statuses `current`, ordinary/reopened
  `preliminary`, `closed`, `revised`;
- current member, partner и shared sections с backend display labels;
- exact score/progress/coverage/fact-target presentation без преобразования
  unavailable `N/A` в zero;
- heatmap и supported line/bar series через project-owned primitives;
- обязательная text/table alternative и non-hover path ко всем точным values;
- day drill-down и bounded lifecycle history;
- reopen с обязательной причиной и server-owned allowed action;
- reclose с новой immutable revised report revision;
- переход к полному `UF-02`/`M4` для следующего месяца через все
  server-allowed источники: seed, empty или copy; copy не переносит facts.

**Готово, когда:**

- все report/lifecycle states имеют только server-allowed actions;
- informational, overperformance и unavailable metrics не искажаются;
- UI различает original/revised references и не выдаёт revised report за
  перезапись original; фактическую immutable сохранность доказывает backend
  lifecycle/report integration;
- actor/reason/old-new revisions доступны в bounded timeline;
- следующий draft создаётся/open-ится один раз через выбранный server-allowed
  source; неизменность прошлой publication/report доказывает backend;
- промежуточная browser/visual/a11y проверка покрывает report states, таблицы,
  charts/heatmap alternatives, reopen и reclose на mobile/desktop.

### M9 — Собрать и принять frontend release candidate

**Трассировка:** все `UF-01…UF-08`, `W-01…W-15`, `FE-AC-01…17`.
**Зависимости:** `M1…M8`; final `F10` из `B0`.

**Source и integration gate:**

- полный `pnpm check` на clean checkout;
- contract pin/drift, format, lint, Steiger, unit/component/router/integration и
  production build;
- GitHub CI запускает тот же обязательный gate; его результат фиксируется
  отдельно от локального запуска;
- adversarial session, permission, stale, duplicate, unknown outcome, offline,
  reconnect и PII-negative scenarios;
- cross-repository review exact final backend/frontend SHAs.

**Local browser gate:**

- пройти 16 frame groups из `SCREEN_MAP.md` в Chrome/macOS и Safari/iPhone;
- проверить mobile/desktop parity, keyboard, touch, focus, zoom/orientation,
  reduced motion, charts/heatmap alternatives и длинные русские labels;
- зафиксировать отдельный evidence document со средой, refs и результатами.

**M9 готова, когда:** source gate, hosted CI и local browser evidence имеют
отдельные подтверждения; все `FE-AC-01…17` трассируются к test/evidence. Это
frontend release candidate, а не доказательство hosted rollout или месячного
продуктового успеха.

## 7. Последующие обязательные треки вне frontend implementation

### D0 — Спроектировать и выполнить hosted delivery

`D0` не входит в текущий технический дизайн и требует отдельного delivery
design и авторизации до инфраструктурных изменений:

- public HTTPS origin и same-origin `/api` proxy;
- Telegram Allowed URLs и реальный OIDC callback;
- secure session cookie, CSRF, CSP/HSTS и bounded ingress logs;
- API, worker и migrations runtime;
- backup/restore и секреты;
- hosted smoke без PII leakage.

Рекомендация: добавить тонкий Playwright smoke для критического
`routing → proxy → session` path. Он не заменяет ручной Safari/iPhone gate и не
разворачивается в полную дублирующую browser suite. Если рекомендация принята,
нужно отдельно обновить assumption технического дизайна, который сейчас
исключает Playwright.

### P0 — Провести месяц и оценить продуктовый пилот

- Денис и Таня проходят реальный OIDC и ведут месяц без бумажной копии;
- каждый достигает не менее 80% успешных применимых личных дней;
- web/Telegram повторы не создают duplicate effects;
- достигнутые нормы подавляют reminders;
- следующий месяц копируется без facts;
- закрытый report воспроизводится из backend snapshot и facts.

`P0` зависит от hosted `D0`, но его 80% outcome зависит от реального поведения
участников и не является Definition of Done frontend implementation.

## 8. Матрица backend gates для frontend-задач

| Frontend task         | Минимальные published backend gates                                   |
| --------------------- | --------------------------------------------------------------------- |
| `M1` Foundation       | staged pin policy; текущие published operations                       |
| `M2` Auth/AppShell    | `F01`, `F08`; `F09` для bot link                                      |
| `M3` Daily core       | `F01` + существующие Today/fact operations                            |
| `M4` Planning         | `F01…F05`                                                             |
| `M5` Publication      | `F06` + существующие preview/publish operations                       |
| `M6` Day/Ops          | `F02`, `F07` + существующие maintenance/CloseDay/weekly operations    |
| `M7` Reminders        | `F09` + существующие reminder settings/status operations              |
| `M8` Report/Lifecycle | `F02`, `F03`, `F04`, `F07` + существующие report/lifecycle operations |
| `M9` Acceptance       | final `F10`                                                           |

## 9. Общий Definition of Done крупной задачи

Крупная задача получает `DONE`, только если:

1. её product contract и published API pin зафиксированы, где применимо;
2. handwritten код соблюдает FSD ownership, generated код не редактировался;
3. successful responses используют generated TypeScript return types без
   frontend runtime validation; error handling/Problem Details сохраняется;
4. task-specific tests покрывают применимые happy path, права,
   stale/replay/unknown и failure recovery;
5. применимые loading, empty, error, read-only и success states реализованы;
6. для UI-задачи mobile/desktop и keyboard/touch paths сохраняют паритет;
7. соответствующие repository gates проходят на exact final checkout;
8. изменённая traceability обновлена в plan/API coverage/technical design;
9. frontend tests доказывают request/presentation/refetch, а скрытые data/
   atomicity invariants опираются на отдельно названные backend или cross-repo
   integration evidence;
10. local, remote, CI, browser и hosted evidence названы без смешения.

## 10. Рекомендуемый первый ход

После согласования этого плана разумно открыть две независимые рабочие линии:

1. backend `B0`: продолжить `F02` после публикации и проверки финального `F01`;
2. frontend: выполнить `M1` foundation transfer от exact
   `react-starter@258b4e0` с staged OpenAPI gate.

Так frontend получает проверяемый каркас сейчас, а product features не
оказываются привязаны к локальным или выдуманным contracts.
