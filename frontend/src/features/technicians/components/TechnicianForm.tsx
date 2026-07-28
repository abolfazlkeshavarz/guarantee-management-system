import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { technicianSchema, TechnicianFormValues } from '../schemas/technicianSchema'
import { Technician } from '../types'

interface TechnicianFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  technician?: Technician | null
  onSubmit: (data: any) => Promise<void>  // Use any to handle both create and update data
  isLoading?: boolean
}

export function TechnicianForm({
  open,
  onOpenChange,
  technician,
  onSubmit,
  isLoading,
}: TechnicianFormProps) {
  const isEditMode = !!technician

  const form = useForm<TechnicianFormValues>({
    resolver: zodResolver(technicianSchema),
    defaultValues: {
      full_name: '',
      username: '',
      password: '',
      phone: '',
      national_id: '',
      address: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (technician) {
      form.reset({
        full_name: technician.full_name,
        username: technician.username,
        password: '',
        phone: technician.phone || '',
        national_id: technician.national_id || '',
        address: technician.address || '',
        is_active: technician.is_active,
      })
    } else {
      form.reset({
        full_name: '',
        username: '',
        password: '',
        phone: '',
        national_id: '',
        address: '',
        is_active: true,
      })
    }
  }, [technician, form])

  const handleSubmit = async (data: TechnicianFormValues) => {
    let submitData: any = { ...data }
    
    if (isEditMode) {
      // For update: remove password if empty, remove username (can't change)
      if (!submitData.password) {
        delete submitData.password
      }
      delete submitData.username
    } else {
      // For create: password is required
      if (!submitData.password) {
        form.setError('password', { 
          type: 'manual', 
          message: 'Password is required' 
        })
        return
      }
    }
    
    await onSubmit(submitData)
    if (!isLoading) {
      form.reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Technician' : 'Add New Technician'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the technician information below.'
              : 'Fill in the details to add a new technician.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Technician" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="johntech"
                        {...field}
                        disabled={isEditMode}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isEditMode ? 'New Password (optional)' : 'Password *'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isEditMode ? 'Leave blank to keep current' : '••••••'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="national_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>National ID</FormLabel>
                    <FormControl>
                      <Input placeholder="ID123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="123 Tech Street, City"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={field.value ? 'true' : 'false'}
                    onValueChange={(value) => field.onChange(value === 'true')}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}