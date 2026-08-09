// frontend/src/features/technicianPortal/pages/TechnicianDashboardPage.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { technicianAuthService } from '../api/technicianAuth'
import { useTechnicianAuth } from '../contexts/TechnicianAuthContext'
import { NewRepairDialog } from '../components/NewRepairDialog'
import { REPAIR_STATUSES } from '../types'
import { RepairStatusBadge } from '@/features/repairs/components/RepairStatusBadge'
import { RepairViewDialog } from '@/features/repairs/components/RepairViewDialog'
import { Repair } from '@/features/repairs/types'
import { RefreshCw, ClipboardList, CheckCircle, Clock, Eye } from 'lucide-react'
import { FormattedDate } from '@/components/common/FormattedDate'

export function TechnicianDashboardPage() {
  const { technician } = useTechnicianAuth()
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [viewRepair, setViewRepair] = useState<Repair | null>(null)

  // Fetch repairs filed by this technician
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-repairs', page, limit, statusFilter],
    queryFn: () => technicianAuthService.getMyRepairs(page, limit, statusFilter),
  })

  // Calculate stats
  const repairs = data?.repairs || []
  const total = data?.total || 0
  const pending = repairs.filter(r => r.status === 'Pending').length
  const approved = repairs.filter(r => r.status === 'Approved').length

  const stats = [
    { title: t('technicianPortal.totalRepairs'), value: total, icon: ClipboardList, color: 'text-blue-600' },
    { title: t('technicianPortal.pendingReview'), value: pending, icon: Clock, color: 'text-yellow-600' },
    { title: t('repairs.status.approved'), value: approved, icon: CheckCircle, color: 'text-green-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('technicianPortal.welcome', { name: technician?.full_name })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('technicianPortal.welcomeSubtitle')}
          </p>
        </div>
        <NewRepairDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <CardTitle className="text-sm font-medium text-gray-500">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isRTL ? 'text-right' : ''}`}>{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Repairs Table */}
      <Card>
        <CardHeader className={`flex flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <CardTitle>{t('technicianPortal.myRepairReports')}</CardTitle>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Select
              items={[{ value: 'all', label: t('guarantees.allStatus') }, ...REPAIR_STATUSES.map((status) => ({ value: status, label: t(`repairs.status.${status.toLowerCase()}`) }))]}
              value={statusFilter || 'all'}
              onValueChange={(value) => {
                const newValue = value || ''
                setStatusFilter(newValue === 'all' ? '' : newValue)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('technicianPortal.filterByStatus')} />
              </SelectTrigger>
              <SelectContent className={isRTL ? 'text-right' : ''}>
                <SelectItem value="all">{t('guarantees.allStatus')}</SelectItem>
                {REPAIR_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`repairs.status.${status.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} className={isRTL ? 'flex-row-reverse' : ''}>
              <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'me-2'}`} />
              {t('common.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : repairs.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-64 text-gray-500 ${isRTL ? 'text-right' : ''}`}>
              <ClipboardList className="h-12 w-12 mb-4 text-gray-400" />
              <p className="text-lg font-medium">{t('technicianPortal.noRepairsTitle')}</p>
              <p className="text-sm">{t('technicianPortal.noRepairsDesc')}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={isRTL ? 'text-right' : ''}>
                      <TableHead className={isRTL ? 'text-right' : ''}>{t('repairs.table.guarantee')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : ''}>{t('guarantees.table.customer')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : ''}>{t('guarantees.table.product')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : ''}>{t('common.status')}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : ''}>{t('technicianPortal.tableFiled')}</TableHead>
                      <TableHead className={`${isRTL ? 'text-right' : 'text-end'}`}>{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repairs.map((repair) => (
                      <TableRow key={repair.id} className={isRTL ? 'text-right' : ''}>
                        <TableCell className="font-medium">{repair.guarantee_code}</TableCell>
                        <TableCell>{repair.customer_name}</TableCell>
                        <TableCell>{repair.product_name}</TableCell>
                        <TableCell>
                          <RepairStatusBadge status={repair.status} />
                        </TableCell>
                        <TableCell>
                          <FormattedDate date={repair.created_at} format="YYYY/MM/DD" />
                        </TableCell>
                        <TableCell className="text-end">
                          <Button variant="ghost" size="icon-sm" onClick={() => setViewRepair(repair)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data && data.total > 0 && (
                <div className={`flex items-center justify-between mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <p className="text-sm text-gray-500">
                    {t('technicianPortal.showingRepairs', {
                      from: Math.min((data.page - 1) * data.limit + 1, data.total),
                      to: Math.min(data.page * data.limit, data.total),
                      total: data.total,
                    })}
                  </p>
                  <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button
                      variant="outline"
                      disabled={data.page <= 1}
                      onClick={() => setPage(data.page - 1)}
                    >
                      {t('common.next')}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={data.page >= data.last_page}
                      onClick={() => setPage(data.page + 1)}
                    >
                      {t('common.previous')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <RepairViewDialog open={!!viewRepair} onOpenChange={(open) => !open && setViewRepair(null)} repair={viewRepair} />
    </div>
  )
}