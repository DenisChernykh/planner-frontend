import { z } from 'zod'
import { ru } from 'zod/locales'

/**
 * Локализует сообщения валидации Zod на русский язык.
 *
 * @remarks Имеет глобальный side effect: `z.config` меняет сообщения для всех
 * последующих проверок Zod в процессе. Public API `shared/config`
 * импортируется первым в app entrypoint; не переставляйте этот импорт после
 * кода, вызывающего `parse` или `safeParse`.
 */
z.config(ru())
