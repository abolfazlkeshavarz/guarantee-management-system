import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react'
import { Repair } from '../types'
import { RepairStatusBadge } from './RepairStatusBadge'
import { format } from 'date-fns'
import { FormattedDate } from '@/components/common/FormattedDate'

interface RepairTableProps {
  repairs: Repair[]
  onView: (repair: Repair) => void
  onEdit: (repair: Repair) => void
  onDelete: (repair: Repair) => void
  isLoading?: boolean
}

export function RepairTable({
  repairs,
  onView,
  onEdit,
  onDelete,
  isLoading,
}: RepairTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (repairs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg font-medium">No repairs found</p>
        <p className="text-sm">Create a new repair to get started.</p>
      </div>
    )
  }

  const canEdit = (repair: Repair) => {
    return repair.status !== 'Completed' && repair.status !== 'Cancelled'
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Guarantee</TableHead>
            <TableHead>Technician</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {repairs.map((repair) => (
            <TableRow key={repair.id}>
              <TableCell className="font-medium">#{repair.id}</TableCell>
              <TableCell>#{repair.guarantee_id}</TableCell>
              <TableCell>
                {repair.technician_id ? `#${repair.technician_id}` : 'Unassigned'}
              </TableCell>
              <TableCell>
                <RepairStatusBadge status={repair.status} />
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {repair.description}
              </TableCell>
              <TableCell>
                {format(new Date(repair.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" className="h-8 w-8 p-0" />}
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(repair)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {canEdit(repair) && (
                      <DropdownMenuItem onClick={() => onEdit(repair)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onDelete(repair)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}