import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { EXPIRING_WINDOWS } from '../types'
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
import { guaranteeService } from '../api/guarantees'
import { GUARANTEE_STATUSES, type Guarantee } from '../types'
import { productService } from '@/features/products/api/products'

interface GuaranteeExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GuaranteeExportDialog({ open, onOpenChange }: GuaranteeExportDialogProps) {
  const { t, i18n } = useTranslation()
  const { formatDate } = useCalendar()

  const [status, setStatus] = useState('all')
  const [productId, setProductId] = useState('all')
  const [expiringWithin, setExpiringWithin] = useState('all')
  const [codeFrom, setCodeFrom] = useState('')
  const [codeTo, setCodeTo] = useState('')

  const { data: products = [] } = useQuery({
    queryKey: ['products-list-for-filter'],
    queryFn: () => productService.list(1, 100).then((r) => r.products),
    enabled: open,
  })

  const handleExport = async (format: ExportFormat) => {
    const rows = await fetchAllPages<Guarantee>(async (page, limit) => {
      const res = await guaranteeService.list(
        page,
        limit,
        '',
        status !== 'all' ? status : '',
        undefined,
        productId !== 'all' ? Number(productId) : undefined,
        undefined,
        expiringWithin !== 'all' ? Number(expiringWithin) : undefined
      )
      return { items: res.guarantees, total: res.total }
    })

    // Code range is a client-side filter: the API has no such parameter, and
    // codes sort meaningfully as plain strings (e.g. 1405FZD0212365).
    const from = codeFrom.trim()
    const to = codeTo.trim()
    const filtered = rows.filter((g) => {
      if (from && g.code < from) return false
      if (to && g.code > to) return false
      return true
    })

    if (filtered.length === 0) {
      toast.error(t('exports.noRows', { defaultValue: 'No rows match those filters' }))
      return
    }

    await exportRows({
      rows: filtered,
      fileName: `guarantees-${new Date().toISOString().slice(0, 10)}`,
      format,
      rightToLeft: i18n.language === 'fa',
      columns: [
        { header: t('guarantees.table.code'), value: (g) => g.code },
        { header: t('guarantees.table.customer'), value: (g) => g.customer_name },
        { header: t('guarantees.table.product'), value: (g) => g.product_name },
        {
          header: t('guarantees.table.purchaseDate'),
          value: (g) => formatDate(g.purchase_date, 'YYYY/MM/DD'),
        },
        {
          header: t('guarantees.table.expiryDate'),
          value: (g) => formatDate(g.expiry_date, 'YYYY/MM/DD'),
        },
        {
          header: t('guarantees.goldenExpiry'),
          value: (g) => (g.golden_expiry_date ? formatDate(g.golden_expiry_date, 'YYYY/MM/DD') : ''),
        },
        { header: t('guarantees.tier._'), value: (g) => g.tier ?? '' },
        {
          header: t('guarantees.remaining.column'),
          value: (g) =>
            g.days_remaining === undefined
              ? ''
              : g.days_remaining < 0
                ? t('guarantees.remaining.expiredColumn', { days: Math.abs(g.days_remaining) })
                : String(g.days_remaining),
        },
        {
          header: t('common.status'),
          value: (g) => t(`status.${g.status}`, { defaultValue: g.status }),
        },
        {
          header: t('guarantees.approvedByColumn'),
          value: (g) => g.approved_by_username ?? '',
        },
        { header: t('common.notes'), value: (g) => g.notes },
      ],
    })

    toast.success(t('exports.done', { defaultValue: 'Export ready', count: filtered.length }))
  }

  return (
    <ExportDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('exports.guaranteesTitle', { defaultValue: 'Export guarantees' })}
      onExport={handleExport}
    >
      <div className="space-y-2">
        <Label>{t('common.status')}</Label>
        <Select
          items={[
            { value: 'all', label: t('guarantees.allStatus') },
            ...GUARANTEE_STATUSES.map((s) => ({
              value: s,
              label: t(`status.${s}`, { defaultValue: s }),
            })),
          ]}
          value={status}
          onValueChange={(v) => setStatus(v || 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('guarantees.allStatus')}</SelectItem>
            {GUARANTEE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`status.${s}`, { defaultValue: s })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('guarantees.table.product')}</Label>
        <Select
          items={[
            { value: 'all', label: t('common.all') },
            ...products.map((p: any) => ({ value: String(p.id), label: p.name })),
          ]}
          value={productId}
          onValueChange={(v) => setProductId(v || 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {products.map((p: any) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('guarantees.remaining.filterLabel')}</Label>
        <Select
          items={[
            { value: 'all', label: t('guarantees.expiring.any') },
            ...EXPIRING_WINDOWS.map((m) => ({
              value: String(m),
              label: t('guarantees.expiring.within', { months: m }),
            })),
          ]}
          value={expiringWithin}
          onValueChange={(v) => setExpiringWithin(v || 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('guarantees.expiring.any')}</SelectItem>
            {EXPIRING_WINDOWS.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {t('guarantees.expiring.within', { months: m })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t('exports.codeFrom', { defaultValue: 'Code from' })}</Label>
          <Input value={codeFrom} onChange={(e) => setCodeFrom(e.target.value)} placeholder="1405..." />
        </div>
        <div className="space-y-2">
          <Label>{t('exports.codeTo', { defaultValue: 'Code to' })}</Label>
          <Input value={codeTo} onChange={(e) => setCodeTo(e.target.value)} placeholder="1405..." />
        </div>
      </div>
    </ExportDialog>
  )
}
