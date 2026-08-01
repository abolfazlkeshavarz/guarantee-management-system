// frontend/src/features/technicianPortal/components/NewRepairDialog.tsx
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { technicianAuthService } from '../api/technicianAuth'
import { technicianGuaranteeService } from '../api/technicianGuarantees'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

export function NewRepairDialog() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [guaranteeId, setGuaranteeId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  
  const debouncedSearch = useDebounce(search, 300)
  const queryClient = useQueryClient()

  const { data: results = [], isLoading: searchLoading } = useQuery({
    queryKey: ['guarantee-search', debouncedSearch],
    queryFn: () => technicianGuaranteeService.search(debouncedSearch),
    enabled: debouncedSearch.length > 1,
  })

  const createMutation = useMutation({
    mutationFn: () => technicianAuthService.createRepair({ guarantee_id: guaranteeId!, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-repairs'] })
      toast.success('Repair created')
      setOpen(false)
      setGuaranteeId(null)
      setSearch('')
      setDescription('')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create repair'),
  })

  const handleCreate = () => {
    if (!guaranteeId || !description.trim()) return
    createMutation.mutate()
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearch('')
      setGuaranteeId(null)
      setDescription('')
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Repair
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Repair Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Guarantee (search by code, customer, or product)</Label>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setGuaranteeId(null)
              }}
              placeholder="Search for a guarantee..."
            />
            {searchLoading && (
              <p className="text-sm text-muted-foreground">Searching...</p>
            )}
            {results.length > 0 && !guaranteeId && (
              <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                {results.map((g: any) => (
                  <button
                    key={g.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setGuaranteeId(g.id)
                      setSearch(`#${g.id} — ${g.customer_name} — ${g.product_name}`)
                    }}
                  >
                    #{g.id} — {g.customer_name} — {g.product_name}
                  </button>
                ))}
              </div>
            )}
            {guaranteeId && (
              <p className="text-sm text-green-600">
                ✓ Guarantee selected
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Issue Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={!guaranteeId || !description.trim() || createMutation.isPending}
            onClick={handleCreate}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Repair'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}