/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/theme-provider'

/**
 * Instant light/dark mode toggle.
 *
 * The first visit defaults to the OS/browser preference ('system'); the first
 * click persists an explicit 'light' or 'dark' choice. There is no System
 * option in the UI — it only seeds the initial theme.
 */
export function ThemeToggle() {
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      size='icon'
      variant='ghost'
      aria-label={isDark ? t('Switch to light mode') : t('Switch to dark mode')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <Sun className='size-[1.2rem]' aria-hidden='true' />
      ) : (
        <Moon className='size-[1.2rem]' aria-hidden='true' />
      )}
    </Button>
  )
}
