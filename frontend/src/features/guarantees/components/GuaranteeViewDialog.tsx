import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Guarantee } from '../types'
import { GuaranteeStatusBadge } from './GuaranteeStatusBadge'
import { FormattedDate } from '@/components/common/FormattedDate'
import { Calendar, User, Package, FileText, Image, Clock, CheckCircle2, XCircle } from 'lucide-react'

interface GuaranteeViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guarantee: Guarantee | null
}

export function GuaranteeViewDialog({
  open,
  onOpenChange,
  guarantee,
}: GuaranteeViewDialogProps) {
  if (!guarantee) return null

  const DetailRow = ({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon?: React.ElementType }) => (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />}
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  )

  const isExpired = new Date(guarantee.expiry_date) < new Date()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Guarantee Details</span>
            <GuaranteeStatusBadge status={guarantee.status} />
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono font-medium">{guarantee.code}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow 
              label="Customer" 
              value={guarantee.customer_name} 
              icon={User}
            />
            <DetailRow 
              label="Product" 
              value={guarantee.product_name} 
              icon={Package}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <DetailRow 
              label="Purchase Date" 
              value={<FormattedDate date={guarantee.purchase_date} format="full" />}
              icon={Calendar}
            />
            <DetailRow 
              label="Expiry Date" 
              value={
                <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                  <FormattedDate date={guarantee.expiry_date} format="full" />
                  {isExpired && ' (Expired)'}
                </span>
              } 
              icon={Clock}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Images</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Invoice</p>
                {guarantee.invoice_image ? (
                  <a 
                    href={guarantee.invoice_image} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Image className="h-4 w-4" />
                    View Invoice
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">No invoice uploaded</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Guarantee Card</p>
                {guarantee.guarantee_card_image ? (
                  <a 
                    href={guarantee.guarantee_card_image} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Image className="h-4 w-4" />
                    View Card
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">No card uploaded</p>
                )}
              </div>
            </div>
          </div>

          {guarantee.notes && (
            <>
              <Separator />
              <DetailRow 
                label="Notes" 
                value={guarantee.notes} 
                icon={FileText}
              />
            </>
          )}

          {(guarantee.approved_by_username || guarantee.created_by_username) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {guarantee.created_by_username && (
                  <DetailRow 
                    label="Created By" 
                    value={guarantee.created_by_username} 
                    icon={CheckCircle2}
                  />
                )}
                {guarantee.approved_by_username && (
                  <DetailRow 
                    label="Approved By" 
                    value={guarantee.approved_by_username} 
                    icon={XCircle}
                  />
                )}
              </div>
              {guarantee.approved_at && (
                <p className="text-xs text-muted-foreground">
                  Approved on: <FormattedDate date={guarantee.approved_at} format="full" />
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}