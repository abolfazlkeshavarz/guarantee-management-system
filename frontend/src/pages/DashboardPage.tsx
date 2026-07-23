import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { dashboardService } from '@/api/dashboard'
import {
  Users,
  Package,
  ClipboardList,
  Wrench,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'

const stats = [
  {
    title: 'Total Guarantees',
    value: '1,234',
    icon: ShieldCheck,
    color: 'text-blue-600',
  },
  {
    title: 'Pending Guarantees',
    value: '45',
    icon: AlertTriangle,
    color: 'text-yellow-600',
  },
  {
    title: 'Total Customers',
    value: '856',
    icon: Users,
    color: 'text-green-600',
  },
  {
    title: 'Active Technicians',
    value: '23',
    icon: Wrench,
    color: 'text-purple-600',
  },
  {
    title: 'Total Products',
    value: '342',
    icon: Package,
    color: 'text-indigo-600',
  },
  {
    title: 'Pending Repairs',
    value: '12',
    icon: ClipboardList,
    color: 'text-red-600',
  },
]

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getDashboardStats,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
        <p className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
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