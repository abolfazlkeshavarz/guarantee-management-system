import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, PackageCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { technicianPartShipmentService } from '@/features/partShipments/api/partShipments'
import {
  METHODS_NEEDING_TRACKING,
  SHIPPING_METHODS,
  ShippableItem,
  ShippingMethod,
} from '@/features/partShipments/types'

interface NewPartShipmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Today as the YYYY-MM-DD string the API expects, in the user's own timezone. */
function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * "ارسال قطعه" -- the form a technician fills in to send back the parts they
 * replaced. Every replaced part from their repair reports that has not been sent
 * yet is listed; they tick what is in this parcel and say how it is travelling.
 */
export function NewPartShipmentDialog({ open, onOpenChange }: NewPartShipmentDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const queryClient = useQueryClient()

  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [conditions, setConditions] = useState<Record<number, string>>({})
  const [method, setMethod] = useState<ShippingMethod>('post')
  const [tracking, setTracking] = useState('')
  const [sentOn, setSentOn] = useState(todayIso())
  const [notes, setNotes] = useState('')

  const { data: shippable = [], isLoading } = useQuery({
    queryKey: ['shippable-parts'],
    queryFn: () => technicianPartShipmentService.shippable(),
    enabled: open,
  })

  // A fresh form, with everything ticked, each time the dialog opens: most
  // parcels carry all the parts a technician is holding.
  useEffect(() => {
    if (open) {
      setSelected({})
      setConditions({})
      setMethod('post')
      setTracking('')
      setSentOn(todayIso())
      setNotes('')
    }
  }, [open])

  useEffect(() => {
    if (open && shippable.length > 0) {
      setSelected((prev) =>
        Object.keys(prev).length > 0
          ? prev
          : Object.fromEntries(shippable.map((p) => [p.repair_component_item_id, true]))
      )
    }
  }, [open, shippable])

  // Group by repair so a technician sees which job each part came out of.
  const groups = useMemo(() => {
    const map = new Map<number, ShippableItem[]>()
    for (const item of shippable) {
      const list = map.get(item.repair_id) ?? []
      list.push(item)
      map.set(item.repair_id, list)
    }
    return Array.from(map.entries())
  }, [shippable])

  const selectedIds = shippable
    .filter((p) => selected[p.repair_component_item_id])
    .map((p) => p.repair_component_item_id)

  const needsTracking = METHODS_NEEDING_TRACKING.includes(method)
  const trackingMissing = needsTracking && !tracking.trim()
  const canSubmit = selectedIds.length > 0 && !trackingMissing && !!sentOn

  const createMutation = useMutation({
    mutationFn: () =>
      technicianPartShipmentService.create({
        shipping_method: method,
        tracking_code: tracking.trim() || undefined,
        sent_on: sentOn,
        notes: notes.trim() || undefined,
        items: selectedIds.map((id) => ({
          repair_component_item_id: id,
          condition_note: conditions[id]?.trim() || undefined,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-part-shipments'] })
      queryClient.invalidateQueries({ queryKey: ['my-part-shipments-summary'] })
      queryClient.invalidateQueries({ queryKey: ['shippable-parts'] })
      toast.success(t('partShipments.form.success'))
      onOpenChange(false)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('common.error')),
  })

  const allSelected = shippable.length > 0 && selectedIds.length === shippable.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[680px] max-h-[92vh] overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {t('partShipments.form.title')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('partShipments.form.description')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : shippable.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <PackageCheck className="h-10 w-10 mb-3 text-emerald-500" />
            <p className="font-medium text-foreground">{t('partShipments.form.nothingTitle')}</p>
            <p className="text-sm">{t('partShipments.form.nothingDesc')}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Which parts ───────────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('partShipments.form.partsLabel')} *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSelected(
                      allSelected
                        ? {}
                        : Object.fromEntries(shippable.map((p) => [p.repair_component_item_id, true]))
                    )
                  }
                >
                  {allSelected ? t('partShipments.form.clearAll') : t('partShipments.form.selectAll')}
                </Button>
              </div>

              <div className="space-y-3 max-h-[34vh] overflow-y-auto rounded-lg border p-2">
                {groups.map(([repairId, items]) => (
                  <div key={repairId} className="space-y-1">
                    <p className="px-1 text-xs font-medium text-muted-foreground">
                      {t('partShipments.form.fromRepair', {
                        id: repairId,
                        code: items[0].guarantee_code,
                      })}
                      {items[0].product_name && ` · ${items[0].product_name}`}
                      {items[0].customer_name && ` · ${items[0].customer_name}`}
                    </p>
                    {items.map((item) => {
                      const id = item.repair_component_item_id
                      const checked = !!selected[id]
                      return (
                        <div
                          key={id}
                          className={`rounded-md border p-2 ${checked ? 'border-primary/40 bg-primary/5' : ''}`}
                        >
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 accent-primary"
                              checked={checked}
                              onChange={(e) =>
                                setSelected((prev) => ({ ...prev, [id]: e.target.checked }))
                              }
                            />
                            <span className="min-w-0">
                              <span className="block font-medium">{item.component_name}</span>
                              {item.repair_report && (
                                <span className="block text-xs text-muted-foreground">
                                  {item.repair_report}
                                </span>
                              )}
                            </span>
                          </label>
                          {checked && (
                            <Input
                              className="mt-2"
                              value={conditions[id] ?? ''}
                              onChange={(e) =>
                                setConditions((prev) => ({ ...prev, [id]: e.target.value }))
                              }
                              placeholder={t('partShipments.form.conditionPlaceholder')}
                              maxLength={500}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('partShipments.form.selectedCount', {
                  selected: selectedIds.length,
                  total: shippable.length,
                })}
              </p>
            </div>

            {/* ── How it is travelling ──────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('partShipments.form.method')} *</Label>
                <Select
                  items={SHIPPING_METHODS.map((m) => ({
                    value: m,
                    label: t(`partShipments.method.${m}`),
                  }))}
                  value={method}
                  onValueChange={(v) => setMethod((v as ShippingMethod) || 'post')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {t(`partShipments.method.${m}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {t('partShipments.form.trackingCode')}
                  {needsTracking ? ' *' : ` (${t('forms.optional')})`}
                </Label>
                <Input
                  dir="ltr"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder={t('partShipments.form.trackingPlaceholder')}
                  maxLength={100}
                  aria-invalid={trackingMissing && tracking.length > 0}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('partShipments.form.sentOn')} *</Label>
                <DatePicker
                  value={sentOn}
                  onChange={(date) => setSentOn(date)}
                  placeholder={t('partShipments.form.sentOn')}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {t('partShipments.form.notes')} ({t('forms.optional')})
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={t('partShipments.form.notesPlaceholder')}
                className="resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          {shippable.length > 0 && (
            <Button
              type="button"
              disabled={!canSubmit || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending
                ? t('partShipments.form.submitting')
                : t('partShipments.form.submit', { count: selectedIds.length })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
