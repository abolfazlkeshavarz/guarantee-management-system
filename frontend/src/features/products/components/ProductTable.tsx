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
import { Product } from '../types'
import { FormattedDate } from '@/components/common/FormattedDate'

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete?: (product: Product) => void
  isLoading?: boolean
}

export function ProductTable({ products, onEdit, onDelete, isLoading }: ProductTableProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (products.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">{t('common.noResultsTitle')}</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.id')}</TableHead>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('products.table.category')}</TableHead>
            <TableHead>{t('common.description')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead>{t('common.created')}</TableHead>
            <TableHead className="text-end">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">#{product.id}</TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell><Badge variant="outline">{product.category_name}</Badge></TableCell>
              <TableCell className="max-w-xs truncate">{product.description || '-'}</TableCell>
              <TableCell>
                <Badge variant={product.is_active ? 'default' : 'secondary'}>
                  {product.is_active ? t('forms.active') : t('forms.inactive')}
                </Badge>
              </TableCell>
              <TableCell><FormattedDate date={product.created_at} format="YYYY/MM/DD" /></TableCell>
              <TableCell className="text-end">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(product)}>
                      <Edit className="me-2 h-4 w-4" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                    {onDelete && (
<DropdownMenuItem onClick={() => onDelete(product)} className="text-destructive">
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