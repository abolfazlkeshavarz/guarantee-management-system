import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { technicianPartRequestService } from '@/features/partRequests/api/partRequests'
import { PackageCheck, FilePen } from 'lucide-react'

interface Props {
  /** Open the repair report for one guarantee with these delivered lines ticked. */
  onWriteReport: (guaranteeCode: string, itemIds: number[]) => void
}

interface PartLine {
  itemId: number
  requestId: number
  name: string
  quantity: number
  guaranteeCode: string
}

/**
 * The parts the office has handed to this technician and that are not yet on a
 * repair report, grouped by the guarantee they were issued for. Ticking some
 * and pressing the button opens the report with exactly those parts listed,
 * ready for a description of each.
 */
export function DeliveredPartsCard({ onWriteReport }: Props) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const [selected, setSelected] = useState<Record<string, number[]>>({})

  // Delivery happens on someone else's screen, so never trust a cached answer.
  // Limit 100: the API clamps anything higher back down to 10.
  const { data } = useQuery({
    queryKey: ['my-delivered-part-requests'],
    queryFn: () => technicianPartRequestService.list(1, 100, 'Delivered'),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 60_000,
  })

  // A line with no catalog entry (a custom item) or no guarantee cannot back a
  // repair line, and a line already fitted on a standing repair is spent.
  const lines: PartLine[] = (data?.requests ?? []).flatMap((request) =>
    (request.items ?? [])
      .filter((item) => (item.item_id ?? 0) > 0 && !item.used_in_repair_id && request.guarantee_code)
      .map((item) => ({
        itemId: item.id,
        requestId: request.id,
        name: item.item_name,
        quantity: item.quantity,
        guaranteeCode: request.guarantee_code as string,
      }))
  )

  const groups = new Map<string, PartLine[]>()
  for (const line of lines) {
    groups.set(line.guaranteeCode, [...(groups.get(line.guaranteeCode) ?? []), line])
  }

  if (groups.size === 0) return null

  const toggle = (code: string, itemId: number) =>
    setSelected((prev) => {
      const current = prev[code] ?? []
      return {
        ...prev,
        [code]: current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
      }
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <PackageCheck className="h-5 w-5 text-green-600" />
          {t('technicianPortal.deliveredPartsTitle')}
        </CardTitle>
        <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
          {t('technicianPortal.deliveredPartsHint')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {[...groups.entries()].map(([code, items]) => {
          const picked = selected[code] ?? []
          return (
            <div key={code} className="rounded-md border p-3 space-y-2">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="font-medium" dir="ltr">{code}</span>
                <Button
                  size="sm"
                  disabled={picked.length === 0}
                  onClick={() => {
                    onWriteReport(code, picked)
                    setSelected((prev) => ({ ...prev, [code]: [] }))
                  }}
                  className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <FilePen className="h-4 w-4" />
                  {t('technicianPortal.writeReportForSelected', { count: picked.length })}
                </Button>
              </div>
              <ul className="space-y-1">
                {items.map((line) => (
                  <li key={line.itemId}>
                    <label
                      className={`flex items-center gap-3 rounded px-2 py-1.5 hover:bg-muted cursor-pointer ${
                        isRTL ? 'flex-row-reverse text-right' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={picked.includes(line.itemId)}
                        onChange={() => toggle(code, line.itemId)}
                      />
                      <span className="flex-1">
                        {line.name}
                        {line.quantity > 1 ? ` ×${line.quantity}` : ''}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t('technicianPortal.fromRequestNo', { id: line.requestId })}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
