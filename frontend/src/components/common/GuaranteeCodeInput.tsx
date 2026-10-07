import { forwardRef, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { sanitizeGuaranteeCode } from '@/lib/guaranteeCode'

type Props = Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> & {
  value: string
  onChange: (value: string) => void
}

/**
 * A text box that only lets English letters and numbers in. Anything else -
 * a Persian digit, a Persian letter, a space - is removed as it is typed or
 * pasted, and a short note says why, so the field never looks like it ignored
 * the keyboard for no reason.
 */
export const GuaranteeCodeInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, className, ...rest }, ref) => {
    const { t } = useTranslation()
    const [rejected, setRejected] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

    useEffect(() => () => clearTimeout(timer.current), [])

    const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const clean = sanitizeGuaranteeCode(raw)
      if (clean !== raw) {
        setRejected(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setRejected(false), 4000)
      }
      onChange(clean)
    }

    return (
      <div className="space-y-1">
        <Input
          ref={ref}
          {...rest}
          value={value}
          onChange={handle}
          dir="ltr"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className={className}
        />
        {rejected && (
          <p className="text-xs text-amber-600" role="status">
            {t('guaranteeCode.englishOnly')}
          </p>
        )}
      </div>
    )
  }
)
GuaranteeCodeInput.displayName = 'GuaranteeCodeInput'
