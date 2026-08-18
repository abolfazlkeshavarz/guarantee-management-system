import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, Loader2 } from 'lucide-react'
import type { ExportFormat } from '@/lib/export'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Page-specific filter fields. */
  children?: ReactNode
  /** Does the fetching + file generation. Rejects to surface an error toast. */
  onExport: (format: ExportFormat) => Promise<void>
}

/**
 * Shared shell for the per-page export dialogs: format picker, the page's own
 * filter fields, and a button that reports progress.
 *
 * Filters live here rather than on the page's filter bar because exports need
 * dimensions the tables do not offer (guarantee-code ranges, region, family
 * name), and because exporting is not the same question as "what am I looking
 * at right now".
 */
export function ExportDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onExport,
}: ExportDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const [format, setFormat] = useState<ExportFormat>('xlsx')
  const [busy, setBusy] = useState(false)

  const handleExport = async () => {
    setBusy(true)
    try {
      await onExport(format)
      onOpenChange(false)
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          t('exports.failed', { defaultValue: 'Export failed' })
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>{title}</DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {description ??
              t('exports.description', {
                defaultValue:
                  'Choose a format and narrow the rows. The file uses the language currently shown.',
              })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('exports.format', { defaultValue: 'Format' })}</Label>
            <Select
              items={[
                { value: 'xlsx', label: t('exports.excel', { defaultValue: 'Excel (.xlsx)' }) },
                { value: 'csv', label: t('exports.csv', { defaultValue: 'CSV (.csv)' }) },
              ]}
              value={format}
              onValueChange={(value) => setFormat((value as ExportFormat) || 'xlsx')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">
                  {t('exports.excel', { defaultValue: 'Excel (.xlsx)' })}
                </SelectItem>
                <SelectItem value="csv">
                  {t('exports.csv', { defaultValue: 'CSV (.csv)' })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {children}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleExport} disabled={busy}>
            {busy ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="me-2 h-4 w-4" />
            )}
            {busy
              ? t('exports.exporting', { defaultValue: 'Exporting...' })
              : t('exports.export', { defaultValue: 'Export' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
