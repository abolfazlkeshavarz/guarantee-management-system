import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Download, Upload, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { technicianService } from '../api/technicians'
import { TechnicianImportResult } from '../types'

interface TechnicianImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

export function TechnicianImportDialog({
  open,
  onOpenChange,
  onImported,
}: TechnicianImportDialogProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<TechnicianImportResult | null>(null)

  const reset = () => {
    setFile(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const importMutation = useMutation({
    mutationFn: (f: File) => technicianService.import(f),
    onSuccess: (res) => {
      setResult(res)
      if (res.created > 0) {
        toast.success(t('technicians.import.done', { created: res.created }))
        onImported()
      }
      if (res.created === 0 && (res.errors?.length ?? 0) === 0 && res.skipped > 0) {
        toast.info(t('technicians.import.allSkipped'))
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common.error'))
    },
  })

  const templateMutation = useMutation({
    mutationFn: () => technicianService.downloadTemplate(),
    onError: () => toast.error(t('common.error')),
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('technicians.import.title')}</DialogTitle>
          <DialogDescription>{t('technicians.import.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{t('technicians.import.columnsTitle')}</p>
            <p className="mt-1 text-muted-foreground">
              {t('technicians.import.columnsHint')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => templateMutation.mutate()}
              disabled={templateMutation.isPending}
            >
              <Download className="me-2 h-4 w-4" />
              {t('technicians.import.downloadTemplate')}
            </Button>
          </div>

          <div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              className="block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
              onChange={(e) => {
                setResult(null)
                setFile(e.target.files?.[0] ?? null)
              }}
            />
            {file && (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                {file.name}
              </p>
            )}
          </div>

          {result && (
            <div className="rounded-md border border-border p-3 text-sm">
              <p>
                {t('technicians.import.summary', {
                  created: result.created,
                  skipped: result.skipped,
                  failed: result.errors?.length ?? 0,
                })}
              </p>
              {(result.errors?.length ?? 0) > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-destructive">
                  {(result.errors ?? []).slice(0, 50).map((err) => (
                    <li key={err.row}>
                      {t('technicians.import.rowError', { row: err.row, message: err.message })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {result ? t('common.close', { defaultValue: 'Close' }) : t('common.cancel')}
          </Button>
          <Button
            onClick={() => file && importMutation.mutate(file)}
            disabled={!file || importMutation.isPending}
          >
            <Upload className="me-2 h-4 w-4" />
            {importMutation.isPending
              ? t('technicians.import.importing')
              : t('technicians.import.action')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
