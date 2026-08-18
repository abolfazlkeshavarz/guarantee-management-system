import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ExportDialog } from '@/components/common/ExportDialog'
import { exportRows, fetchAllPages, type ExportFormat } from '@/lib/export'
import { useCalendar } from '@/contexts/CalendarContext'
import { customerService } from '../api/customers'
import type { Customer } from '../types'

interface CustomerExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerExportDialog({ open, onOpenChange }: CustomerExportDialogProps) {
  const { t, i18n } = useTranslation()
  const { formatDate } = useCalendar()

  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [familyName, setFamilyName] = useState('')

  const handleExport = async (format: ExportFormat) => {
    const rows = await fetchAllPages<Customer>(async (page, limit) => {
      const res = await customerService.list(page, limit, '')
      return { items: res.customers, total: res.total }
    })

    // City / province / family name are matched here rather than server-side:
    // the customers endpoint only takes a single free-text `search`, which
    // cannot express three independent fields at once.
    const norm = (v: string) => v.trim().toLowerCase()
    const wantCity = norm(city)
    const wantRegion = norm(region)
    const wantFamily = norm(familyName)

    const filtered = rows.filter((c) => {
      if (wantCity && !norm(c.city || '').includes(wantCity)) return false
      if (wantRegion && !norm(c.province || '').includes(wantRegion)) return false
      // Names are stored as one full_name, so "family name" is a match on any
      // part of it rather than a dedicated surname column.
      if (wantFamily && !norm(c.full_name || '').includes(wantFamily)) return false
      return true
    })

    if (filtered.length === 0) {
      toast.error(t('exports.noRows'))
      return
    }

    await exportRows({
      rows: filtered,
      fileName: `customers-${new Date().toISOString().slice(0, 10)}`,
      format,
      rightToLeft: i18n.language === 'fa',
      columns: [
        { header: t('common.name'), value: (c) => c.full_name },
        { header: t('common.phone'), value: (c) => c.phone },
        { header: t('customers.table.nationalId'), value: (c) => c.national_id },
        { header: t('exports.region'), value: (c) => c.province },
        { header: t('exports.city'), value: (c) => c.city },
        { header: t('exports.address'), value: (c) => c.address },
        {
          header: t('common.created'),
          value: (c) => formatDate(c.created_at, 'YYYY/MM/DD'),
        },
      ],
    })

    toast.success(t('exports.done', { count: filtered.length }))
  }

  return (
    <ExportDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('exports.customersTitle')}
      onExport={handleExport}
    >
      <div className="space-y-2">
        <Label>{t('exports.city')}</Label>
        <Input value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t('exports.region')}</Label>
        <Input value={region} onChange={(e) => setRegion(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t('exports.familyName')}</Label>
        <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
      </div>
    </ExportDialog>
  )
}
