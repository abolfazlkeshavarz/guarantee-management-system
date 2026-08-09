import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Guarantee } from '../types'
import { GuaranteeStatusBadge } from './GuaranteeStatusBadge'
import { FormattedDate } from '@/components/common/FormattedDate'
import { Calendar, User, Package, FileText, Clock, CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import { resolveFileUrl } from '@/lib/utils'

function ImagePreviewLink({ url, label }: { url: string; label: string }) {
  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(url)
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      {isImage ? (
        <img src={url} alt={label} className="h-20 w-full rounded-md border object-cover hover:opacity-90" />
      ) : (
        <span className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          <FileText className="h-4 w-4" /> {label}
        </span>
      )}
    </a>
  )
}

interface GuaranteeViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guarantee: Guarantee | null
}

export function GuaranteeViewDialog({ open, onOpenChange, guarantee }: GuaranteeViewDialogProps) {
  const { t } = useTranslation()
  if (!guarantee) return null

  const DetailRow = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) => (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />}
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  )

  const isExpired = new Date(guarantee.expiry_date) < new Date()
  const hasGolden = !!guarantee.golden_expiry_date
  const normalStart = guarantee.golden_expiry_date || guarantee.purchase_date

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Guarantee Details</span>
            <GuaranteeStatusBadge status={guarantee.status} />
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono font-medium">{guarantee.code}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label={t('guarantees.table.customer')} value={guarantee.customer_name} icon={User} />
            <DetailRow label={t('guarantees.table.product')} value={guarantee.product_name} icon={Package} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DetailRow
              label={t('guarantees.table.purchaseDate')}
              value={<FormattedDate date={guarantee.purchase_date} format="full" />}
              icon={Calendar}
            />
            <DetailRow
              label={t('guarantees.table.expiryDate')}
              value={
                <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                  <FormattedDate date={guarantee.expiry_date} format="full" />
                  {isExpired && ` ${t('guarantees.expired')}`}
                </span>
              }
              icon={Clock}
            />
          </div>

          <Separator />

          {/* ── Four-date period overview ── */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('guarantees.guaranteePeriods')}</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Golden period card */}
              {hasGolden ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-600 flex items-center gap-1 mb-2">
                    <Sparkles className="h-3 w-3" />
                    {t('guarantees.goldenPeriod')}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('guarantees.goldenStart')}</span>
                      <FormattedDate date={guarantee.golden_start_date!} format="YYYY/MM/DD" className="font-medium text-amber-700" />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('guarantees.goldenEnd')}</span>
                      <FormattedDate date={guarantee.golden_expiry_date!} format="YYYY/MM/DD" className="font-medium text-amber-700" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-3 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">{t('guarantees.noGolden')}</p>
                </div>
              )}

              {/* Normal period card */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">{t('guarantees.normalPeriod')}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('guarantees.normalStart')}</span>
                    <FormattedDate date={normalStart} format="YYYY/MM/DD" className="font-medium text-slate-700" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('guarantees.normalEnd')}</span>
                    <FormattedDate date={guarantee.expiry_date} format="YYYY/MM/DD" className="font-medium text-slate-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Images */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Images</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Invoice</p>
                {guarantee.invoice_image
                  ? <ImagePreviewLink url={resolveFileUrl(guarantee.invoice_image)} label="View Invoice" />
                  : <p className="text-sm text-muted-foreground">No invoice uploaded</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Guarantee Card</p>
                {guarantee.guarantee_card_image
                  ? <ImagePreviewLink url={resolveFileUrl(guarantee.guarantee_card_image)} label="View Card" />
                  : <p className="text-sm text-muted-foreground">No card uploaded</p>}
              </div>
            </div>
          </div>

          {guarantee.notes && (
            <>
              <Separator />
              <DetailRow label={t('common.notes')} value={guarantee.notes} icon={FileText} />
            </>
          )}

          {(guarantee.approved_by_username || guarantee.created_by_username) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {guarantee.created_by_username && (
                  <DetailRow label="Created By" value={guarantee.created_by_username} icon={CheckCircle2} />
                )}
                {guarantee.approved_by_username && (
                  <DetailRow label="Approved By" value={guarantee.approved_by_username} icon={XCircle} />
                )}
              </div>
              {guarantee.approved_at && (
                <p className="text-xs text-muted-foreground">
                  Approved on: <FormattedDate date={guarantee.approved_at} format="full" />
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}