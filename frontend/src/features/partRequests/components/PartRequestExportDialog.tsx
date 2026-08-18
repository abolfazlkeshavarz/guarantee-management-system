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

    if (rows.length === 0) {
      toast.error(t('exports.noRows'))
      return
    }

    await exportRows({
      rows,
      fileName: `part-requests-${new Date().toISOString().slice(0, 10)}`,
      format,
      rightToLeft: i18n.language === 'fa',
      columns: [
        { header: t('exports.technician'), value: (r) => r.technician_name },
        { header: t('exports.item'), value: (r) => r.item_name },
        { header: t('exports.quantity'), value: (r) => r.quantity },
        { header: t('exports.guaranteeCode'), value: (r) => r.guarantee_code ?? '' },
        { header: t('exports.customerName'), value: (r) => r.customer_name ?? '' },
        {
          header: t('common.status'),
          value: (r) => t(`partRequests.status.${r.status}`, { defaultValue: r.status }),
        },
        { header: t('common.notes'), value: (r) => r.notes },
        { header: t('exports.reviewedBy'), value: (r) => r.reviewed_by_name ?? '' },
        {
          header: t('common.created'),
          value: (r) => formatDate(r.created_at, 'YYYY/MM/DD'),
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
