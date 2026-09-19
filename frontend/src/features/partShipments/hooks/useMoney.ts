import { useTranslation } from 'react-i18next'

/**
 * Amounts are whole numbers (no fractional currency), stored as integers on the
 * server. This formats them with the active language's digits and grouping and,
 * when asked, the unit -- which lives in one translation string
 * (partShipments.currency) so it is a one-line change if the company invoices in
 * a different unit.
 */
export function useMoney() {
  const { t, i18n } = useTranslation()
  const formatter = new Intl.NumberFormat(i18n.language === 'fa' ? 'fa-IR' : 'en-US')

  return {
    format: (value: number) => formatter.format(value),
    withUnit: (value: number) => `${formatter.format(value)} ${t('partShipments.currency')}`,
  }
}

const DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

/**
 * Turns whatever was typed into a whole number. Persian and Arabic-Indic digits
 * are converted, and separators/spaces are dropped, so "۱٬۲۵۰٬۰۰۰" and
 * "1,250,000" both read as 1250000. Anything that is not a digit is ignored.
 */
export function parseAmount(raw: string): number {
  const ascii = raw.replace(/[۰-۹٠-٩]/g, (d) => DIGIT_MAP[d] ?? d)
  const digits = ascii.replace(/\D/g, '')
  if (!digits) return 0
  const n = Number(digits)
  return Number.isSafeInteger(n) ? n : 0
}
