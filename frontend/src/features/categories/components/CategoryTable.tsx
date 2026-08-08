import { useTranslation } from 'react-i18next'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { Category } from '../types'
import { FormattedDate } from '@/components/common/FormattedDate'

interface CategoryTableProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  isLoading?: boolean
}

export function CategoryTable({ categories, onEdit, onDelete, isLoading }: CategoryTableProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (categories.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">{t('common.noResultsTitle')}</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.id')}</TableHead>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('common.description')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead>{t('common.created')}</TableHead>
            <TableHead className="text-end">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">#{category.id}</TableCell>
              <TableCell>{category.name}</TableCell>
              <TableCell className="max-w-xs truncate">{category.description || '-'}</TableCell>
              <TableCell>
                <Badge variant={category.is_active ? 'default' : 'secondary'}>
                  {category.is_active ? t('forms.active') : t('forms.inactive')}
                </Badge>
              </TableCell>
              <TableCell>
                <FormattedDate date={category.created_at} format="MMM DD, YYYY" />
              </TableCell>
              <TableCell className="text-end">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(category)}>
                      <Edit className="me-2 h-4 w-4" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(category)} className="text-destructive">
                      <Trash2 className="me-2 h-4 w-4" />
                      {t('common.delete')}
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