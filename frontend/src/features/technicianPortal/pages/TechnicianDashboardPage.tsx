// frontend/src/features/technicianPortal/pages/TechnicianDashboardPage.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
    { title: 'Total Repairs', value: total, icon: ClipboardList, color: 'text-blue-600' },
    { title: 'Pending Review', value: pending, icon: Clock, color: 'text-yellow-600' },
    { title: 'Approved', value: approved, icon: CheckCircle, color: 'text-green-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {technician?.full_name}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here are the repair reports you've filed and their review status.
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Repairs Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Repair Reports</CardTitle>
          <div className="flex items-center gap-4">
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => {
                const newValue = value || ''
                setStatusFilter(newValue === 'all' ? '' : newValue)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {REPAIR_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 me-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : repairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ClipboardList className="h-12 w-12 mb-4 text-gray-400" />
              <p className="text-lg font-medium">No repair reports yet</p>
              <p className="text-sm">Use "New Repair" to file a report against a guarantee.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guarantee</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Filed</TableHead>
                      <TableHead className="text-end">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repairs.map((repair) => (
                      <TableRow key={repair.id}>
                        <TableCell className="font-medium">{repair.guarantee_code}</TableCell>
                        <TableCell>{repair.customer_name}</TableCell>
                        <TableCell>{repair.product_name}</TableCell>
                        <TableCell>
                          <RepairStatusBadge status={repair.status} />
                        </TableCell>
                        <TableCell>
                          <FormattedDate date={repair.created_at} format="MMM DD, YYYY" />
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
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Showing {Math.min((data.page - 1) * data.limit + 1, data.total)} to{' '}
                    {Math.min(data.page * data.limit, data.total)} of {data.total} repairs
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={data.page <= 1}
                      onClick={() => setPage(data.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={data.page >= data.last_page}
                      onClick={() => setPage(data.page + 1)}
                    >
                      Next
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
