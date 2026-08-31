# Planner frontend: обязательный контракт агента

## Контекст и источник решений

Planner — online-only, server-authoritative React-приложение для месячного
планирования. Перед изменением handwritten frontend-кода прочитай
`TECHNICAL_DESIGN.md` и относящуюся к задаче карточку в
`IMPLEMENTATION_PLAN.md`. Эти документы владеют product-правилами, API,
маршрутами и проверками; этот файл задаёт короткие обязательные границы для
работы агента.

- Сохраняй FSD-направление: `app → pages → widgets → features → entities → shared`.
- `app` владеет providers и router, `pages` — route-композицией, `widgets` —
  крупной повторяемой композицией, `features` — пользовательскими действиями,
  `entities` — query identity/cache и самостоятельным read UI, `shared` —
  техническими механизмами и UI primitives.
- Используй public API slice через `index.ts`; не создавай параллельный
  `src/modules`, не переноси query/cache или generated hooks в pages и не
  редактируй generated OpenAPI/Orval output вручную.

## React и UI

1. `useEffect` — escape hatch. Перед его добавлением предпочитай derived
   values, event handlers, React Query options, router state, component keys
   или перенос логики в entity/model hooks. Если `useEffect` действительно
   нужен, в итоговом отчёте объясни, с какой внешней системой он синхронизируется
   и почему альтернативы не подходят.
2. Для handwritten UI-компонента ориентир — 100–120 строк. В диапазоне
   100–150 строк обязательна инженерная проверка: не смешаны ли layout, data
   mapping, user actions и повторяемые UI-фрагменты. После 150 строк компонент
   следует разделить внутри текущего FSD slice, кроме generated, non-UI и явно
   обоснованных исключений. Не дроби файлы механически и не расширяй public API
   slice без необходимости.
3. Если false-ветка JSX пуста, используй `condition && <Component />`, а не
   `condition ? <Component /> : null`. Тернарный оператор допустим, когда обе
   ветки содержат осмысленный UI. Перед `&&` используй только булево условие:
   для чисел и строк — явное сравнение или `Boolean(...)`.

## Проверка и отчёт

- Проверяй изменённый код минимальным релевантным gate из проекта; `pnpm check`
  остаётся полным локальным source gate.
- Отделяй source review, local checks, browser/runtime, CI и deployment: один
  уровень не доказывает другой.
