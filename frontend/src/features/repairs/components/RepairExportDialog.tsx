import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ExportDialog } from '@/components/common/ExportDialog'
import { exportRows, fetchAllPages, type ExportFormat } from '@/lib/export'
import { useCalendar } from '@/contexts/CalendarContext'
import { repairService } from '../api/repairs'
import type { Repair } from '../types'

interface RepairExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RepairExportDialog({ open, onOpenChange }: RepairExportDialogProps) {
  const { t, i18n } = useTranslation()
  const { formatDate } = useCalendar()

  const [technician, setTechnician] = useState('')
  const [guaranteeCode, setGuaranteeCode] = useState('')
  const [customerName, setCustomerName] = useState('')

  const handleExport = async (format: ExportFormat) => {
    const rows = await fetchAllPages<Repair>(async (page, limit) => {
      const res = await repairService.list(page, limit, '')
      return { items: res.repairs, total: res.total }
    })

    // The repairs endpoint filters by status only, so technician / guarantee
    // code / customer are matched here against the already-resolved names the
    // DTO carries.
    const norm = (v: string) => v.trim().toLowerCase()
    const wantTech = norm(technician)
    const wantCode = norm(guaranteeCode)
    const wantCustomer = norm(customerName)

    const filtered = rows.filter((r) => {
      if (wantTech && !norm(r.technician_name || '').includes(wantTech)) return false
      if (wantCode && !norm(r.guarantee_code || '').includes(wantCode)) return false
      if (wantCustomer && !norm(r.customer_name || '').includes(wantCustomer)) return false
      return true
    })

    if (filtered.length === 0) {
      toast.error(t('exports.noRows'))
      return
    }

    const joinItems = (items: Array<{ report?: string }>, nameOf: (i: any) => string) =>
      items
        .map((i) => (i.report ? `${nameOf(i)} (${i.report})` : nameOf(i)))
        .join(' | ')

    await exportRows({
      rows: filtered,
      fileName: `repairs-${new Date().toISOString().slice(0, 10)}`,
      format,
      rightToLeft: i18n.language === 'fa',
      columns: [
        { header: t('exports.guaranteeCode'), value: (r) => r.guarantee_code },
        { header: t('exports.customerName'), value: (r) => r.customer_name },
        { header: t('exports.product'), value: (r) => r.product_name },
        { header: t('exports.technician'), value: (r) => r.technician_name },
        {
          header: t('common.status'),
          value: (r) => t(`status.${r.status}`, { defaultValue: r.status }),
        },
        {
          header: t('repairItems.componentsReplaced'),
          value: (r) => joinItems(r.components ?? [], (i) => i.component_name),
        },
        {
          header: t('repairItems.servicesPerformed'),
          value: (r) => joinItems(r.services ?? [], (i) => i.service_name),
        },
        { header: t('common.notes'), value: (r) => r.description },
        { header: t('exports.reviewedBy'), value: (r) => r.reviewed_by_name ?? '' },
        {
          header: t('common.created'),
          value: (r) => formatDate(r.created_at, 'YYYY/MM/DD'),
        },
      ],
    })

    toast.success(t('exports.done', { count: filtered.length }))
  }

  return (
    <ExportDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('exports.repairsTitle')}
      onExport={handleExport}
    >
      <div className="space-y-2">
        <Label>{t('exports.technician')}</Label>
        <Input value={technician} onChange={(e) => setTechnician(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t('exports.guaranteeCode')}</Label>
        <Input value={guaranteeCode} onChange={(e) => setGuaranteeCode(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t('exports.customerName')}</Label>
        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      </div>
    </ExportDialog>
  )
}
