import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { dashboardService } from '@/api/dashboard'
import { RefreshCw } from 'lucide-react'
import {
  Users, Package, ClipboardList, Wrench, ShieldCheck, AlertTriangle,
  CheckCircle, Clock,
} from 'lucide-react'
import { useCalendar } from '@/contexts/CalendarContext'

export function DashboardPage() {
  const navigate = useNavigate()
  const { formatDate } = useCalendar()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getDashboardStats,
  })

  const stats = [
    {
      title: 'Total Guarantees',
      value: data?.total_guarantees?.toLocaleString() || '0',
      icon: ShieldCheck,
      color: 'text-blue-600',
      path: '/guarantees',
    },
    {
      title: 'Pending Guarantees',
      value: data?.pending_guarantees?.toLocaleString() || '0',
      icon: AlertTriangle,
      color: 'text-yellow-600',
      path: '/guarantees?status=Pending',
    },
    {
      title: 'Active Guarantees',
      value: data?.active_guarantees?.toLocaleString() || '0',
      icon: CheckCircle,
      color: 'text-green-600',
      path: '/guarantees?status=Approved',
    },
    {
      title: 'Expired Guarantees',
      value: data?.expired_guarantees?.toLocaleString() || '0',
      icon: Clock,
      color: 'text-red-600',
      path: '/guarantees?status=Expired',
    },
    {
      title: 'Total Customers',
      value: data?.total_customers?.toLocaleString() || '0',
      icon: Users,
      color: 'text-green-600',
      path: '/customers',
    },
    {
      title: 'Active Technicians',
      value: data?.total_technicians?.toLocaleString() || '0',
      icon: Wrench,
      color: 'text-purple-600',
      path: '/technicians',
    },
    {
      title: 'Total Products',
      value: data?.total_products?.toLocaleString() || '0',
      icon: Package,
      color: 'text-indigo-600',
      path: '/catalog/products',
    },
    {
      title: 'Pending Repairs',
      value: data?.pending_repairs?.toLocaleString() || '0',
      icon: ClipboardList,
      color: 'text-red-600',
      path: '/repairs?status=Pending',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <p className="text-sm text-gray-500">
            Last updated: {formatDate(new Date(), 'full')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const isClickable = stat.path !== undefined
          
          return (
            <Card 
              key={stat.title}
              className={`${isClickable ? 'cursor-pointer hover:shadow-lg transition-all hover:scale-105' : ''}`}
              onClick={() => isClickable && navigate(stat.path)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}