import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, RefreshCw, Filter } from 'lucide-react'
import { FormattedDate } from '@/components/common/FormattedDate'
import { auditService, type AuditLogFilters } from '../api/audit'

const ACTION_STYLES: Record<string, string> = {
  create: 'bg-green-100 text-green-800 border-green-200',
  update: 'bg-blue-100 text-blue-800 border-blue-200',
  delete: 'bg-red-100 text-red-800 border-red-200',
  approve: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  review: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  reject: 'bg-orange-100 text-orange-800 border-orange-200',
  cancel: 'bg-orange-100 text-orange-800 border-orange-200',
  login: 'bg-gray-100 text-gray-800 border-gray-200',
}

export function AuditLogPage() {
  const { t } = useTranslation()

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [actor, setActor] = useState('')
  const [debouncedActor, setDebouncedActor] = useState('')
  const [actorType, setActorType] = useState('all')
  const [action, setAction] = useState('all')
  const [entityType, setEntityType] = useState('all')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedActor(actor)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [actor])

  const filters: AuditLogFilters = {
    actor: debouncedActor || undefined,
    actor_type: actorType !== 'all' ? actorType : undefined,
    action: action !== 'all' ? action : undefined,
    entity_type: entityType !== 'all' ? entityType : undefined,
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, limit, filters],
    queryFn: () => auditService.list(page, limit, filters),
  })

  const { data: vocab } = useQuery({
    queryKey: ['audit-vocabulary'],
    queryFn: auditService.vocabulary,
  })

  const resetFilters = () => {
    setActor('')
    setActorType('all')
    setAction('all')
    setEntityType('all')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('audit.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('audit.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder={t('audit.searchActor')}
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="ps-10"
          />
        </div>

        <Select
          items={[
            { value: 'all', label: t('audit.allUsers') },
            { value: 'admin', label: t('audit.roleAdmin') },
            { value: 'technician', label: t('audit.roleTechnician') },
            { value: 'public', label: t('audit.rolePublic') },
          ]}
          value={actorType}
          onValueChange={(v) => {
            setActorType(v || 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('audit.allUsers')}</SelectItem>
            <SelectItem value="admin">{t('audit.roleAdmin')}</SelectItem>
            <SelectItem value="technician">{t('audit.roleTechnician')}</SelectItem>
            <SelectItem value="public">{t('audit.rolePublic')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          items={[
            { value: 'all', label: t('audit.allActions') },
            ...(vocab?.actions ?? []).map((a) => ({
              value: a,
              label: t(`audit.action.${a}`, { defaultValue: a }),
            })),
          ]}
          value={action}
          onValueChange={(v) => {
            setAction(v || 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('audit.allActions')}</SelectItem>
            {(vocab?.actions ?? []).map((a) => (
              <SelectItem key={a} value={a}>
                {t(`audit.action.${a}`, { defaultValue: a })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={[
            { value: 'all', label: t('audit.allEntities') },
            ...(vocab?.entity_types ?? []).map((e) => ({ value: e, label: e })),
          ]}
          value={entityType}
          onValueChange={(v) => {
            setEntityType(v || 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('audit.allEntities')}</SelectItem>
            {(vocab?.entity_types ?? []).map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={resetFilters}>
          <Filter className="me-2 h-4 w-4" />
          {t('common.reset')}
        </Button>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('audit.when')}</TableHead>
              <TableHead>{t('audit.who')}</TableHead>
              <TableHead>{t('audit.role')}</TableHead>
              <TableHead>{t('audit.what')}</TableHead>
              <TableHead>{t('audit.entity')}</TableHead>
              <TableHead>{t('audit.record')}</TableHead>
              <TableHead>{t('audit.ip')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (data?.logs?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t('common.noResultsTitle')}
                </TableCell>
              </TableRow>
            )}
            {data?.logs?.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">
                  <FormattedDate date={entry.created_at} format="full" />
                </TableCell>
                <TableCell className="font-medium">{entry.actor_name || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {t(`audit.role${entry.actor_type.charAt(0).toUpperCase()}${entry.actor_type.slice(1)}`, {
                      defaultValue: entry.actor_type,
                    })}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={ACTION_STYLES[entry.action] ?? 'bg-gray-100 text-gray-800'}
                  >
                    {t(`audit.action.${entry.action}`, { defaultValue: entry.action })}
                  </Badge>
                </TableCell>
                <TableCell>{entry.entity_type}</TableCell>
                <TableCell>{entry.entity_id ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{entry.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {t('common.showingRange', {
              from: (data.page - 1) * data.limit + 1,
              to: Math.min(data.page * data.limit, data.total),
              total: data.total,
              defaultValue: `Showing {{from}}-{{to}} of {{total}}`,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Select
              items={[25, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
              value={String(limit)}
              onValueChange={(v) => {
                setLimit(Number(v))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
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
    </div>
  )
}
