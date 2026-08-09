import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The period dropdown showed English because the labels are built on the
 * server: GetGuaranteePeriods() returns hardcoded strings like
 * "12 Months (1 Year)", which no amount of frontend translation could reach.
 *
 * The `months` value in the same payload is the real data, so we ignore the
 * server label entirely and build the text here where i18n applies.
 */
export function useGuaranteePeriodLabel() {
  const { t, i18n } = useTranslation()
  const isFarsi = i18n.language === 'fa'

  // Persian text reads badly with Latin digits next to it, so numerals get
  // localised as well as the words around them.
  const num = useCallback(
    (value: number) => (isFarsi ? value.toLocaleString('fa-IR') : String(value)),
    [isFarsi]
  )

  return useCallback(
    (months: number): string => {
      if (months > 0 && months % 12 === 0) {
        const years = months / 12
        return t('public.register.periodWithYears', {
          months: num(months),
          years: num(years),
          defaultValue: '{{months}} months ({{years}} year)',
        })
      }
      return t('public.register.periodMonths', {
        months: num(months),
        defaultValue: '{{months}} months',
      })
    },
    [t, num]
  )
}
