import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  RefreshCw,
  Filter,
  AlertTriangle,
  ArrowRight,
  ShieldOff,
  PackageSearch,
} from 'lucide-react'
import { FormattedDate } from '@/components/common/FormattedDate'
import { technicianService } from '@/features/technicians/api/technicians'
import { pipelineService } from '../api/pipeline'
import {
  PIPELINE_STAGES,
  STAGE_COLORS,
  STAGE_DESTINATION,
  TERMINAL_STAGES,
  PipelineCase,
} from '../types'

/**
 * One row per service case, showing the whole lifecycle rather than the slice
 * that happens to live on this screen: what stage it is in, how long it has
 * been there, and where to go to move it on.
 */
export function PipelinePage() {
  const { t } = useTranslation()

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  // "open" is the useful default: finished work is history, not a worklist.
  const [stage, setStage] = useState('open')
  const [technicianFilter, setTechnicianFilter] = useState('all')
  const [onlyAttention, setOnlyAttention] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-list-for-pipeline'],
    queryFn: () => technicianService.list(1, 100).then((r) => r.technicians),
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pipeline', page, limit, stage, debouncedSearch, technicianFilter, onlyAttention],
    queryFn: () =>
      pipelineService.list(
        page,
        limit,
        stage,
        debouncedSearch,
        technicianFilter !== 'all' ? Number(technicianFilter) : undefined,
        onlyAttention
      ),
  })

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['pipeline-summary'],
    queryFn: () => pipelineService.summary(),
  })

  const resetFilters = () => {
    setStage('open')
    setTechnicianFilter('all')
    setOnlyAttention(false)
    setSearch('')
    setPage(1)
  }

  const chips = [
    { value: 'open', label: t('pipeline.openCases'), count: summary?.open_total ?? 0 },
    ...PIPELINE_STAGES.map((s) => ({
      value: s,
      label: t(`pipeline.stage.${s}`),
      count: summary?.stages?.[s] ?? 0,
    })),
    { value: 'all', label: t('common.all'), count: undefined as number | undefined },
  ]

  /** What is holding this case up, in the case's own numbers. */
  const blockerFor = (c: PipelineCase): string => {
    switch (c.stage) {
      case 'PartsToApprove':
        return t('pipeline.blocker.partsToApprove', { count: c.parts_pending_approval })
      case 'PartsInTransit':
        return t('pipeline.blocker.partsInTransit', { count: c.parts_open })
      case 'PartsToReturn':
        return t('pipeline.blocker.partsToReturn', { count: c.parts_to_return })
      case 'ParcelInTransit':
        return t('pipeline.blocker.parcelInTransit', { count: c.parcels_in_transit })
      case 'AwaitingInvoice':
        return t('pipeline.blocker.awaitingInvoice', { count: c.parcels_to_invoice })
      case 'AwaitingPayment':
        return t('pipeline.blocker.awaitingPayment', { count: c.parcels_to_pay })
      case 'AwaitingReview':
        return t('pipeline.blocker.awaitingReview')
      default:
        return ''
    }
  }

  const cases = data?.cases ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('pipeline.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('pipeline.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            refetch()
            refetchSummary()
          }}
        >
          <RefreshCw className="me-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* The one thing worth interrupting someone for. */}
      {!!summary?.needs_attention && summary.needs_attention > 0 && !onlyAttention && (
        <button
          type="button"
          onClick={() => {
            setOnlyAttention(true)
            setStage('open')
            setPage(1)
          }}
          className="w-full flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-start hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-900">
                {t('pipeline.stalledTitle', { count: summary.needs_attention })}
              </p>
              <p className="text-sm text-amber-800">{t('pipeline.stalledDesc')}</p>
            </div>
          </div>
          <span className="text-sm font-medium text-amber-700 shrink-0">
            {t('pipeline.showThem')}
          </span>
        </button>
      )}

      {/* Stage chips double as the filter and the count summary. */}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = stage === chip.value
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => {
                setStage(chip.value)
                setPage(1)
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              {chip.label}
              {chip.count !== undefined && chip.count > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[10px] font-semibold ${
                    active ? 'bg-primary-foreground/20' : 'bg-muted-foreground/15'
                  }`}
                >
                  {chip.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder={t('pipeline.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>

        <Select
          items={[
            { value: 'all', label: t('pipeline.allTechnicians') },
            ...technicians.map((tech) => ({ value: String(tech.id), label: tech.full_name })),
          ]}
          value={technicianFilter}
          onValueChange={(value) => {
            setTechnicianFilter(value ?? 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('pipeline.allTechnicians')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('pipeline.allTechnicians')}</SelectItem>
            {technicians.map((tech) => (
              <SelectItem key={tech.id} value={String(tech.id)}>
                {tech.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={onlyAttention ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setOnlyAttention((v) => !v)
            setPage(1)
          }}
        >
          <AlertTriangle className="me-2 h-4 w-4" />
          {t('pipeline.stalledOnly')}
        </Button>

        <Select
          value={String(limit)}
          onValueChange={(value) => {
            setLimit(Number(value))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" onClick={resetFilters} size="sm">
          <Filter className="h-4 w-4 me-2" />
          {t('common.reset')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <PackageSearch className="h-12 w-12 mb-4 text-gray-400" />
          <p className="text-lg font-medium">{t('pipeline.emptyTitle')}</p>
          <p className="text-sm">{t('pipeline.emptyDesc')}</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pipeline.table.case')}</TableHead>
                <TableHead>{t('pipeline.table.customer')}</TableHead>
                <TableHead>{t('partShipments.table.technician')}</TableHead>
                <TableHead>{t('pipeline.table.stage')}</TableHead>
                <TableHead>{t('pipeline.table.waiting')}</TableHead>
                <TableHead className="text-end">{t('pipeline.table.next')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => {
                const destination = STAGE_DESTINATION[c.stage]
                const terminal = TERMINAL_STAGES.includes(c.stage)
                return (
                  <TableRow
                    key={c.repair_id}
                    className={c.needs_attention ? 'bg-amber-50 border-s-4 border-s-amber-500' : ''}
                  >
                    <TableCell>
                      <div className="font-medium">#{c.repair_id}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {c.guarantee_code}
                      </div>
                      {c.guarantee_was_expired && (
                        <Badge
                          variant="outline"
                          className="mt-1 bg-red-100 text-red-800 border-red-200 gap-1"
                        >
                          <ShieldOff className="h-3 w-3" />
                          {t('pipeline.outOfWarranty')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{c.customer_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.product_name}
                        {c.customer_city ? ` · ${c.customer_city}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>{c.technician_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STAGE_COLORS[c.stage] || ''}>
                        {t(`pipeline.stage.${c.stage}`)}
                      </Badge>
                      {blockerFor(c) && (
                        <div className="text-xs text-muted-foreground mt-1">{blockerFor(c)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {terminal ? (
                        <span className="text-muted-foreground text-sm">—</span>
                      ) : (
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              c.needs_attention ? 'text-amber-700' : ''
                            }`}
                          >
                            {t('pipeline.daysInStage', { count: c.days_in_stage })}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            <FormattedDate date={c.stage_since} format="YYYY/MM/DD" />
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      {destination ? (
                        <Link to={destination}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            {t(`pipeline.action.${c.stage}`)}
                            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {c.stage === 'PartsToReturn'
                            ? t('pipeline.waitingOnTechnician')
                            : '—'}
                        </span>
                      )}
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
              entity: t('pipeline.entity'),
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
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
    </div>
  )
}
