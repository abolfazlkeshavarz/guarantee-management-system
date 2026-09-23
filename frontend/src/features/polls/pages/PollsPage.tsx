import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Search, RefreshCw, MessageSquareQuote, Trash2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { FormattedDate } from '@/components/common/FormattedDate'
import { pollService } from '../api/polls'
import { POLL_STATUSES, POLL_STATUS_COLORS, Poll } from '../types'
import { PollFormDialog } from '../components/PollFormDialog'

/**
 * Every poll, with the delivery and response funnel on the row so it is
 * obvious which ones are worth opening.
 */
export function PollsPage() {
  const { t } = useTranslation()
  const { canManageStaff: isFullAdmin } = usePermissions()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Poll | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['polls', page, statusFilter, debouncedSearch],
    queryFn: () => pollService.list(page, 10, statusFilter, debouncedSearch),
  })

  const onError = (error: any) => toast.error(error.response?.data?.message || t('common.error'))

  const createMutation = useMutation({
    mutationFn: pollService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] })
      toast.success(t('polls.createSuccess'))
      setIsFormOpen(false)
    },
    onError,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => pollService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] })
      toast.success(t('polls.deleteSuccess'))
      setDeleting(null)
    },
    onError,
  })

  const polls = data?.polls ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('polls.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('polls.subtitle')}</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('polls.add')}
        </Button>
      </div>

      <Tabs
        value={statusFilter}
        onValueChange={(value: string) => {
          setStatusFilter(value || 'all')
          setPage(1)
        }}
      >
        <TabsList>
          <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
          {POLL_STATUSES.map((status) => (
            <TabsTrigger key={status} value={status}>
              {t(`polls.status.${status}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder={t('polls.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()} size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : polls.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <MessageSquareQuote className="h-12 w-12 mb-4 text-gray-400" />
          <p className="text-lg font-medium">{t('polls.emptyTitle')}</p>
          <p className="text-sm">{t('polls.emptyDesc')}</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('polls.table.poll')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('polls.table.audience')}</TableHead>
                <TableHead>{t('polls.table.responses')}</TableHead>
                <TableHead>{t('common.created')}</TableHead>
                <TableHead className="text-end">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {polls.map((poll) => {
                const s = poll.stats
                const rate = s.sent > 0 ? Math.round((s.responded / s.sent) * 100) : 0
                return (
                  <TableRow key={poll.id}>
                    <TableCell>
                      <Link
                        to={`/polls/${poll.id}`}
                        className="font-medium hover:underline"
                      >
                        {poll.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {t('polls.table.questionCount', { count: poll.questions.length })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={POLL_STATUS_COLORS[poll.status] || ''}>
                        {t(`polls.status.${poll.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{s.recipients}</div>
                      {s.pending > 0 && (
                        <div className="text-xs text-amber-700">
                          {t('polls.table.pending', { count: s.pending })}
                        </div>
                      )}
                      {s.failed > 0 && (
                        <div className="text-xs text-red-600">
                          {t('polls.table.failed', { count: s.failed })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{s.responded}</div>
                      {s.sent > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {t('polls.table.responseRate', { rate })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <FormattedDate date={poll.created_at} format="YYYY/MM/DD" />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/polls/${poll.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            {t('polls.open')}
                            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                          </Button>
                        </Link>
                        {isFullAdmin && poll.status === 'Draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => setDeleting(poll)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
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
              entity: t('polls.entity'),
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

      <PollFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        poll={null}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values).catch(() => undefined)
        }}
        isLoading={createMutation.isPending}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('polls.deleteDesc', { name: deleting?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleting!.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
