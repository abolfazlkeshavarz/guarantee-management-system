import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExportDialog } from '@/components/common/ExportDialog'
import { exportRows, fetchAllPages, type ExportFormat } from '@/lib/export'
import { useCalendar } from '@/contexts/CalendarContext'
import { partRequestService } from '../api/partRequests'
import { PART_REQUEST_STATUSES, type PartRequest } from '../types'

interface PartRequestExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PartRequestExportDialog({ open, onOpenChange }: PartRequestExportDialogProps) {
  const { t, i18n } = useTranslation()
  const { formatDate } = useCalendar()
  const [status, setStatus] = useState('all')

  const handleExport = async (format: ExportFormat) => {
    const rows = await fetchAllPages<PartRequest>(async (page, limit) => {
      const res = await partRequestService.list(
        page,
        limit,
        status !== 'all' ? status : ''
      )
      return { items: res.requests, total: res.total }
    })

    // A request holds a list of items, but the sheet had been written from the
    // request's legacy first-item columns -- so every line after the first was
    // silently dropped. One row per item instead: the part is what the reader
    // is counting, and a request with three parts is three things to fulfil.
    const lines = rows.flatMap((r) =>
      (r.items && r.items.length > 0
        ? r.items
        : [
            {
              id: r.id,
              item_type: r.item_type,
              item_name: r.item_name,
              quantity: r.quantity,
              is_custom_item: r.is_custom_item,
            },
          ]
      ).map((item) => ({ request: r, item }))
    )

    if (lines.length === 0) {
      toast.error(t('exports.noRows'))
      return
    }

    await exportRows({
      rows: lines,
      fileName: `part-requests-${new Date().toISOString().slice(0, 10)}`,
      format,
      rightToLeft: i18n.language === 'fa',
      columns: [
        { header: t('partRequests.table.requestId'), value: ({ request }) => `#${request.id}` },
        { header: t('exports.technician'), value: ({ request }) => request.technician_name },
        { header: t('exports.item'), value: ({ item }) => item.item_name },
        {
          header: t('partRequests.itemTypeLabel'),
          value: ({ item }) =>
            t(`partRequests.itemType.${item.item_type}`, { defaultValue: item.item_type }),
        },
        { header: t('exports.quantity'), value: ({ item }) => item.quantity },
        { header: t('exports.guaranteeCode'), value: ({ request }) => request.guarantee_code ?? '' },
        { header: t('exports.customerName'), value: ({ request }) => request.customer_name ?? '' },
        {
          header: t('common.status'),
          value: ({ request }) =>
            t(`partRequests.status.${request.status}`, { defaultValue: request.status }),
        },
        { header: t('common.notes'), value: ({ request }) => request.notes },
        { header: t('exports.reviewedBy'), value: ({ request }) => request.reviewed_by_name ?? '' },
        {
          header: t('common.created'),
          value: ({ request }) => formatDate(request.created_at, 'YYYY/MM/DD'),
        },
      ],
    })

    toast.success(t('exports.done', { count: rows.length }))
  }

  return (
    <ExportDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('exports.partRequestsTitle')}
      onExport={handleExport}
    >
      <div className="space-y-2">
        <Label>{t('common.status')}</Label>
        <Select
          items={[
            { value: 'all', label: t('common.all') },
            ...PART_REQUEST_STATUSES.map((s) => ({
              value: s,
              label: t(`partRequests.status.${s}`, { defaultValue: s }),
            })),
          ]}
          value={status}
          onValueChange={(v) => setStatus(v || 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {PART_REQUEST_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`partRequests.status.${s}`, { defaultValue: s })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ExportDialog>
  )
}
