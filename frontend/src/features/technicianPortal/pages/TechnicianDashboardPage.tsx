import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { technicianAuthService } from '../api/technicianAuth'
import { useTechnicianAuth } from '../contexts/TechnicianAuthContext'
import { REPAIR_STATUSES, REPAIR_STATUS_COLORS } from '../types'
import { toast } from 'sonner'
import { RefreshCw, ClipboardList, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { FormattedDate } from '@/components/common/FormattedDate'

export function TechnicianDashboardPage() {
  const { technician } = useTechnicianAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Fetch repairs assigned to this technician
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-repairs', page, limit, statusFilter],
    queryFn: () => technicianAuthService.getMyRepairs(page, limit, statusFilter),
  })

  // Update repair mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      technicianAuthService.updateRepair(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-repairs'] })
      toast.success('Repair status updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update repair status')
    },
  })

  const handleStatusChange = (repairId: number, status: string) => {
    updateMutation.mutate({ id: repairId, status })
  }

  // Calculate stats
  const repairs = data?.repairs || []
  const total = data?.total || 0
  const pending = repairs.filter(r => r.status === 'Pending').length
  const inProgress = repairs.filter(r => r.status === 'InProgress').length
  const completed = repairs.filter(r => r.status === 'Completed').length

  const stats = [
    { title: 'Total Repairs', value: total, icon: ClipboardList, color: 'text-blue-600' },
    { title: 'Pending', value: pending, icon: Clock, color: 'text-yellow-600' },
    { title: 'In Progress', value: inProgress, icon: RefreshCw, color: 'text-indigo-600' },
    { title: 'Completed', value: completed, icon: CheckCircle, color: 'text-green-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {technician?.full_name}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here are your assigned repairs and their current status.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
          <CardTitle>My Assigned Repairs</CardTitle>
          <div className="flex items-center gap-4">
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => {
                // Handle null/undefined value
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
              <RefreshCw className="h-4 w-4 mr-2" />
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
              <p className="text-lg font-medium">No repairs assigned</p>
              <p className="text-sm">You don't have any repairs assigned to you yet.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Guarantee</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repairs.map((repair) => (
                      <TableRow key={repair.id}>
                        <TableCell className="font-medium">#{repair.id}</TableCell>
                        <TableCell>#{repair.guarantee_id}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {repair.description}
                        </TableCell>
                        <TableCell>
                          <Badge className={REPAIR_STATUS_COLORS[repair.status]}>
                            {repair.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {repair.started_at ? (
                            <FormattedDate date={repair.started_at} format="MMM DD, YYYY" />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {repair.status !== 'Completed' && repair.status !== 'Cancelled' && (
                            <Select
                              value={repair.status}
                              onValueChange={(value) => {
                                if (value) {
                                  handleStatusChange(repair.id, value)
                                }
                              }}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="InProgress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {repair.status === 'Completed' && (
                            <Badge variant="outline" className="text-green-600">
                              Completed
                            </Badge>
                          )}
                          {repair.status === 'Cancelled' && (
                            <Badge variant="outline" className="text-red-600">
                              Cancelled
                            </Badge>
                          )}
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
    </div>
  )
}