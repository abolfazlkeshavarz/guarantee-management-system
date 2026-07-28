import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Repair } from '../types'
import { RepairStatusBadge } from './RepairStatusBadge'
import { format } from 'date-fns'
import { Calendar, Package, FileText, Clock, Wrench } from 'lucide-react'

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800'
      case 'InProgress': return 'bg-blue-100 text-blue-800'
      case 'Completed': return 'bg-green-100 text-green-800'
      case 'Cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Repair Details</span>
            <RepairStatusBadge status={repair.status} />
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono font-medium">Repair #{repair.id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow
              label="Guarantee ID"
              value={`#${repair.guarantee_id}`}
              icon={Package}
            />
            <DetailRow
              label="Status"
              value={
                <Badge className={getStatusColor(repair.status)}>
                  {repair.status}
                </Badge>
              }
            />
          </div>

          <Separator />

          <DetailRow
            label="Description"
            value={repair.description}
            icon={FileText}
          />

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <DetailRow
              label="Technician"
              value={repair.technician_id ? `#${repair.technician_id}` : 'Unassigned'}
              icon={Wrench}
            />
            <DetailRow
              label="Created"
              value={format(new Date(repair.created_at), 'MMMM d, yyyy h:mm a')}
              icon={Calendar}
            />
          </div>

          {(repair.started_at || repair.completed_at) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {repair.started_at && (
                  <DetailRow
                    label="Started"
                    value={format(new Date(repair.started_at), 'MMMM d, yyyy h:mm a')}
                    icon={Clock}
                  />
                )}
                {repair.completed_at && (
                  <DetailRow
                    label="Completed"
                    value={format(new Date(repair.completed_at), 'MMMM d, yyyy h:mm a')}
                    icon={Clock}
                  />
                )}
              </div>
            </>
          )}

          <Separator />

          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium">Timeline</p>
            <div className="mt-2 space-y-1 text-muted-foreground">
              <p>• Created: {format(new Date(repair.created_at), 'PPP p')}</p>
              {repair.started_at && (
                <p>• Started: {format(new Date(repair.started_at), 'PPP p')}</p>
              )}
              {repair.completed_at && (
                <p>• Completed: {format(new Date(repair.completed_at), 'PPP p')}</p>
              )}
              {repair.updated_at && (
                <p>• Last Updated: {format(new Date(repair.updated_at), 'PPP p')}</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}