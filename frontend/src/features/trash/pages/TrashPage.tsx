import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArchiveRestore, RefreshCw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { FormattedDate } from '@/components/common/FormattedDate'
import { invalidateDashboard } from '@/lib/query-client'
import { trashService, TRASH_KINDS, TrashItem, TrashKind } from '../api/trash'

/**
 * Everything that has been deleted anywhere in the panel, grouped by what it
 * is. Nothing here is gone for good: a record is only hidden when it is
 * deleted, and restoring it puts it back exactly as it was.
 */
export function TrashPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [kind, setKind] = useState<TrashKind>('guarantees')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [restoring, setRestoring] = useState<TrashItem | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const { data: summary } = useQuery({
    queryKey: ['trash-summary'],
    queryFn: trashService.summary,
  })
  const counts = new Map((summary ?? []).map((s) => [s.key, s.count]))
  const totalDeleted = (summary ?? []).reduce((n, s) => n + s.count, 0)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trash', kind, page, debouncedSearch],
    queryFn: () => trashService.list(kind, page, 20, debouncedSearch),
  })

  const restoreMutation = useMutation({
    mutationFn: (item: TrashItem) => trashService.restore(kind, item.id),
    onSuccess: () => {
      // A restored record reappears in its own list, in counts and on the
      // dashboard, so refresh everything rather than guess what changed.
      queryClient.invalidateQueries()
      invalidateDashboard()
      toast.success(t('trash.restored'))
      setRestoring(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('trash.restoreFailed'))
      setRestoring(null)
    },
  })

  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('trash.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('trash.subtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TRASH_KINDS.map((k) => {
          const count = counts.get(k) ?? 0
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k)
                setPage(1)
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                kind === k
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted'
              )}
            >
              {t(`trash.kinds.${k}`)}
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs',
                  kind === k ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder={t('trash.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <Trash2 className="h-10 w-10 mb-3 text-gray-400" />
          <p className="text-lg font-medium">
            {totalDeleted === 0 ? t('trash.emptyAll') : t('trash.emptyKind')}
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('trash.table.item')}</TableHead>
                <TableHead>{t('trash.table.details')}</TableHead>
                <TableHead>{t('trash.table.deletedAt')}</TableHead>
                <TableHead className="text-end">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium" dir="auto">
                    {item.label || `#${item.id}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground" dir="auto">
                    {item.detail || '—'}
                  </TableCell>
                  <TableCell>
                    <FormattedDate date={item.deleted_at} format="YYYY/MM/DD" />
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="outline" size="sm" onClick={() => setRestoring(item)}>
                      <ArchiveRestore className="me-1.5 h-4 w-4" />
                      {t('trash.restore')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {t('common.showingRange', {
              from: Math.min((data.page - 1) * data.limit + 1, data.total),
              to: Math.min(data.page * data.limit, data.total),
              total: data.total,
              entity: t('trash.entity'),
            })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>
              {t('common.previous')}
            </Button>
            <Button
              variant="outline"
              disabled={data.page >= data.last_page}
              onClick={() => setPage(data.page + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!restoring} onOpenChange={(open) => !open && setRestoring(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('trash.restoreTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('trash.restoreDesc', { name: restoring?.label })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoring && restoreMutation.mutate(restoring)}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? t('trash.restoring') : t('trash.restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
