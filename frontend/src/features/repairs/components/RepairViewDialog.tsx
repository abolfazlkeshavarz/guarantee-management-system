import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Repair } from '../types'
import { RepairStatusBadge } from './RepairStatusBadge'
import { format } from 'date-fns'
import { Calendar, Package, FileText, Wrench, User, Wrench as ComponentIcon } from 'lucide-react'

interface RepairViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair: Repair | null
}

export function RepairViewDialog({
  open,
  onOpenChange,
  repair,
}: RepairViewDialogProps) {
  if (!repair) return null

  const DetailRow = ({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon?: React.ElementType }) => (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />}
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Repair Details</span>
            <RepairStatusBadge status={repair.status} />
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono font-medium">{repair.guarantee_code}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Customer" value={repair.customer_name} icon={User} />
            <DetailRow label="Product" value={repair.product_name} icon={Package} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Technician" value={repair.technician_name || 'Unassigned'} icon={Wrench} />
            <DetailRow
              label="Submitted"
              value={format(new Date(repair.created_at), 'MMMM d, yyyy h:mm a')}
              icon={Calendar}
            />
          </div>

          {repair.description && (
            <>
              <Separator />
              <DetailRow label="Notes" value={repair.description} icon={FileText} />
            </>
          )}

          {repair.components.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <ComponentIcon className="h-4 w-4" /> Components Replaced
                </p>
                <div className="space-y-2">
                  {repair.components.map((item) => (
                    <div key={item.id} className="bg-muted p-2 rounded-md text-sm">
                      <p className="font-medium">{item.component_name}</p>
                      {item.report && <p className="text-muted-foreground">{item.report}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {repair.services.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Services Performed</p>
                <div className="space-y-2">
                  {repair.services.map((item) => (
                    <div key={item.id} className="bg-muted p-2 rounded-md text-sm">
                      <p className="font-medium">{item.service_name}</p>
                      {item.report && <p className="text-muted-foreground">{item.report}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {repair.reviewed_by_name && (
            <>
              <Separator />
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium">
                  {repair.status} by {repair.reviewed_by_name}
                  {repair.reviewed_at && ` on ${format(new Date(repair.reviewed_at), 'PPP p')}`}
                </p>
                {repair.review_notes && <p className="text-muted-foreground mt-1">{repair.review_notes}</p>}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
