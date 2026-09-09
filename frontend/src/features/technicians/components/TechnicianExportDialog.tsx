import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import { technicianService } from '../api/technicians'
import type { Technician } from '../types'

interface TechnicianExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TechnicianExportDialog({ open, onOpenChange }: TechnicianExportDialogProps) {
  const { t, i18n } = useTranslation()
  const { formatDate } = useCalendar()

  const [nameFilter, setNameFilter] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const handleExport = async (format: ExportFormat) => {
    const rows = await fetchAllPages<Technician>(async (page, limit) => {
      const res = await technicianService.list(page, limit, '')
      return { items: res.technicians, total: res.total }
    })

    const norm = (v: string) => v.trim().toLowerCase()
    const wantName = norm(nameFilter)

    const filtered = rows.filter((tech) => {
      if (status === 'active' && !tech.is_active) return false
      if (status === 'inactive' && tech.is_active) return false
      if (
        wantName &&
        !norm(tech.full_name || '').includes(wantName) &&
        !norm(tech.username || '').includes(wantName)
      ) {
        return false
      }
      return true
    })

    if (filtered.length === 0) {
      toast.error(t('exports.noRows'))
      return
    }

    await exportRows({
      rows: filtered,
      fileName: `technicians-${new Date().toISOString().slice(0, 10)}`,
      format,
      rightToLeft: i18n.language === 'fa',
      columns: [
        { header: t('common.name'), value: (r) => r.full_name },
        { header: t('settings.username'), value: (r) => r.username },
        { header: t('common.phone'), value: (r) => r.phone },
        { header: t('customers.table.nationalId'), value: (r) => r.national_id },
        { header: t('exports.address'), value: (r) => r.address },
        {
          header: t('common.status'),
          value: (r) => (r.is_active ? t('common.active') : t('common.inactive')),
        },
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
      title={t('exports.techniciansTitle')}
      onExport={handleExport}
    >
      <div className="space-y-2">
        <Label>{t('technicians.searchPlaceholder')}</Label>
        <Input value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t('common.status')}</Label>
        <Select
          items={[
            { value: 'all', label: t('common.all') },
            { value: 'active', label: t('common.active') },
            { value: 'inactive', label: t('common.inactive') },
          ]}
          value={status}
          onValueChange={(v) => setStatus((v as 'all' | 'active' | 'inactive') || 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="active">{t('common.active')}</SelectItem>
            <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </ExportDialog>
  )
}
