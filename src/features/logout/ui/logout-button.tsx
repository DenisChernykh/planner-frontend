import { LogOut } from 'lucide-react'

import { Button } from '@/shared/ui'

import { useLogout } from '../model/use-logout'

type LogoutButtonProps = Readonly<{
  className?: string
  variant?: 'destructive' | 'ghost' | 'outline'
}>

export function LogoutButton({
  className,
  variant = 'destructive',
}: LogoutButtonProps) {
  const logout = useLogout()

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        className="w-full justify-start"
        disabled={!logout.isOnline || logout.isBlocked}
        isLoading={logout.isPending}
        loadingLabel="Завершаем сессию"
        onClick={logout.logout}
      >
        <LogOut aria-hidden="true" />
        {logout.isBlocked
          ? 'Выход недоступен'
          : logout.isOnline
            ? 'Выйти'
            : 'Выход недоступен офлайн'}
      </Button>
      {logout.errorMessage === null ? null : (
        <p className="mt-2 text-xs leading-5 text-destructive" role="alert">
          {logout.errorMessage}
        </p>
      )}
    </div>
  )
}
