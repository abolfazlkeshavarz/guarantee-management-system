// The package has no root export -- only ./browser, ./node and ./universal.
// The browser build is the one that triggers a download from the page.
import writeXlsxFile from 'write-excel-file/browser'

export type ExportFormat = 'csv' | 'xlsx'

export interface ExportColumn<T> {
  /** Already-translated header text. */
  header: string
  value: (row: T) => string | number | null | undefined
}

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

/**
 * Excel decides a CSV's encoding from a byte-order mark. Without it, Persian
 * text opens as mojibake, so the BOM is not optional here.
 */
const UTF8_BOM = '﻿'

function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const escape = (raw: string) => {
    // Quote when the value could otherwise break the row/column structure.
    if (/[",\r\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
    return raw
  }

  const lines = [columns.map((c) => escape(c.header)).join(',')]
  for (const row of rows) {
    lines.push(columns.map((c) => escape(cell(c.value(row)))).join(','))
  }
  // CRLF: Excel is the primary consumer and is happiest with it.
  return UTF8_BOM + lines.join('\r\n')
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Builds and downloads the file. Header text must already be translated. */
export async function exportRows<T>(options: {
  rows: T[]
  columns: ExportColumn<T>[]
  /** Without extension; the format supplies it. */
  fileName: string
  format: ExportFormat
  /** Lays the sheet out right-to-left, for Persian exports. */
  rightToLeft?: boolean
}): Promise<void> {
  const { rows, columns, fileName, format, rightToLeft = false } = options

  if (format === 'csv') {
    const blob = new Blob([toCsv(rows, columns)], {
      type: 'text/csv;charset=utf-8;',
    })
    downloadBlob(blob, `${fileName}.csv`)
    return
  }

  const sheet = [
    columns.map((c) => ({ value: c.header, fontWeight: 'bold' as const })),
    ...rows.map((row) => columns.map((c) => ({ value: cell(c.value(row)) }))),
  ]

  // v4 dropped the `fileName` option in favour of returning toBlob/toFile.
  await writeXlsxFile(sheet, {
    // Roughly fit the content; Excel's default of 8 chars clips most fields.
    columns: columns.map(() => ({ width: 22 })),
    rightToLeft,
  }).toFile(`${fileName}.xlsx`)
}

/**
 * Walks every page of a paginated list endpoint and returns the whole set.
 *
 * Exports must cover all matching records, not just the page on screen, and
 * the API caps `limit` at 100 -- so anything larger has to be paged through.
 * The page cap is a guard against an unbounded loop if a backend ever
 * reports a bad total.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<{ items: T[]; total: number }>,
  options: { limit?: number; maxPages?: number } = {}
): Promise<T[]> {
  const limit = options.limit ?? 100
  const maxPages = options.maxPages ?? 200

  const collected: T[] = []
  for (let page = 1; page <= maxPages; page++) {
    const { items, total } = await fetchPage(page, limit)
    collected.push(...items)
    if (items.length === 0 || collected.length >= total) break
  }
  return collected
}
