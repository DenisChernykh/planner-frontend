import { useState } from 'react'
import { ArrowUpRight, WifiOff } from 'lucide-react'

import { useOnlineStatus } from '@/shared/lib/online-status'
import { cn } from '@/shared/lib/utils'
import {
  rootPath,
  storeReturnTo,
  telegramLoginStartPath,
} from '@/shared/routes'
import { Button, buttonVariants, Spinner } from '@/shared/ui'

type TelegramLoginLinkProps = Readonly<{
  label?: string
  returnTo: string | null
  variant?: 'default' | 'outline'
}>

/** Starts a new Telegram OIDC ceremony using exact document navigation. */
export function TelegramLoginLink({
  label = 'Продолжить через Telegram',
  returnTo,
  variant = 'default',
}: TelegramLoginLinkProps) {
  const { isOnline } = useOnlineStatus()
  const [isLeaving, setIsLeaving] = useState(false)

  if (!isOnline) {
    return (
      <Button type="button" variant={variant} className="w-full" disabled>
        <WifiOff aria-hidden="true" />
        Нет подключения
      </Button>
    )
  }

  return (
    <a
      href={telegramLoginStartPath}
      aria-busy={isLeaving || undefined}
      aria-label={isLeaving ? 'Переходим в Telegram' : undefined}
      className={cn(buttonVariants({ variant }), 'relative w-full')}
      onClick={(event) => {
        if (isLeaving) {
          event.preventDefault()
          return
        }
        storeReturnTo(sessionStorage, returnTo ?? rootPath)

        const isPrimaryClick = event.button === 0
        const isModifiedClick =
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
        const isSameTabNavigation =
          event.currentTarget.target === '' ||
          event.currentTarget.target === '_self'

        // Modified/non-primary clicks are allowed to use the browser's native
        // link behavior. Only the unmodified primary same-tab navigation
        // leaves this page, so an auxiliary click cannot strand the control in
        // a permanent loading state.
        if (
          isPrimaryClick &&
          !isModifiedClick &&
          isSameTabNavigation &&
          !event.defaultPrevented
        ) {
          setIsLeaving(true)
        }
      }}
    >
      <span className={cn('contents', isLeaving && 'invisible')}>
        {label}
        <ArrowUpRight aria-hidden="true" />
      </span>
      {isLeaving ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Spinner aria-hidden="true" />
        </span>
      ) : null}
    </a>
  )
}
