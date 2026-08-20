import type { TFunction } from 'i18next'

/**
 * Says how much guarantee time a number of days amounts to, in the units
 * people actually use.
 *
 * Below a month, months would round to zero and read as "0 months", which
 * looks expired when it is not. At a whole number of months the day part is
 * dropped, because "1 month and 0 days" is how a machine talks.
 *
 * Shared so the repair card, the guarantee table and the technician's panel
 * cannot drift into phrasing the same fact three different ways.
 */
export function formatRemaining(t: TFunction, days: number): string {
  const magnitude = Math.abs(days)
  const months = Math.floor(magnitude / 30)
  const remainderDays = magnitude % 30

  if (months < 1) return t('guarantees.remaining.daysOnly', { days: magnitude })
  if (remainderDays === 0) return t('guarantees.remaining.monthsOnly', { months })
  return t('guarantees.remaining.monthsAndDays', { months, days: remainderDays })
}
