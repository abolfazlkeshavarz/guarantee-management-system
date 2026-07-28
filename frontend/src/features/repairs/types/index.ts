export interface Repair {
  id: number
  guarantee_id: number
  technician_id?: number
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled'
  description: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface RepairFormData {
  guarantee_id: number
  technician_id?: number
  description: string
}

export interface RepairListResponse {
  repairs: Repair[]
  total: number
  page: number
  limit: number
  last_page: number
}

export const REPAIR_STATUSES = ['Pending', 'InProgress', 'Completed', 'Cancelled'] as const
export type RepairStatus = typeof REPAIR_STATUSES[number]

export const REPAIR_STATUS_COLORS: Record<RepairStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  InProgress: 'bg-blue-100 text-blue-800 border-blue-200',
  Completed: 'bg-green-100 text-green-800 border-green-200',
  Cancelled: 'bg-red-100 text-red-800 border-red-200',
}