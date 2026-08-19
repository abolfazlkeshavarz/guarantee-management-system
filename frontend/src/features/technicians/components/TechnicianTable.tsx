import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, Power } from 'lucide-react'
import { Technician } from '../types'
import { FormattedDate } from '@/components/common/FormattedDate'

interface TechnicianTableProps {
  technicians: Technician[]
  onEdit: (technician: Technician) => void
  onToggleStatus: (technician: Technician) => void
  onDelete?: (technician: Technician) => void
  isLoading?: boolean
}

export function TechnicianTable({
  technicians,
  onEdit,
  onToggleStatus,
  onDelete,
  isLoading,
}: TechnicianTableProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (technicians.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {t('common.noResultsTitle')}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.id')}</TableHead>
            <TableHead>{t('customers.table.fullName')}</TableHead>
            <TableHead>{t('technicians.table.username')}</TableHead>
            <TableHead>{t('common.phone')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead>{t('common.created')}</TableHead>
            <TableHead className="text-end">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {technicians.map((tech) => (
            <TableRow key={tech.id}>
              <TableCell className="font-medium">#{tech.id}</TableCell>
              <TableCell>{tech.full_name}</TableCell>
              <TableCell>{tech.username}</TableCell>
              <TableCell>{tech.phone || '-'}</TableCell>
              <TableCell>
                <Badge variant={tech.is_active ? 'default' : 'secondary'}>
                  {tech.is_active ? t('forms.active') : t('forms.inactive')}
                </Badge>
              </TableCell>
              <TableCell>
                <FormattedDate date={tech.created_at} format="YYYY/MM/DD" />
              </TableCell>
              <TableCell className="text-end">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" className="h-8 w-8 p-0" />}
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(tech)}>
                      <Edit className="me-2 h-4 w-4" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleStatus(tech)}>
                      <Power className="me-2 h-4 w-4" />
                      {tech.is_active ? t('common.deactivate') : t('common.activate')}
                    </DropdownMenuItem>
                    {onDelete && (
<DropdownMenuItem
                      onClick={() => onDelete(tech)}
                      className="text-destructive"
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      {t('common.delete')}
                    </DropdownMenuItem>
)}
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