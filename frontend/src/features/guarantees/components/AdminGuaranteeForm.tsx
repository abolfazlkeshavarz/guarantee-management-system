import { useEffect, useRef, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { DatePicker } from '@/components/ui/date-picker'
import { customerService } from '@/features/customers/api/customers'
import { publicGuaranteeService } from '../api/publicGuarantee'
import { api } from '@/api/axios'
import { Customer } from '@/features/customers/types'
import { Loader2, Upload, X, FileText, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/useDebounce'

// Define the schema with status as required
const adminGuaranteeSchema = z.object({
  // Customer - either existing or new
  customer_id: z.string().optional(),
  customer_full_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_national_id: z.string().optional(),
  customer_province: z.string().optional(),
  customer_city: z.string().optional(),
  customer_address: z.string().optional(),

  // Guarantee - all required
  guarantee_code: z.string().min(3, 'Guarantee code is required').max(50),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  invoice_image: z.string().optional(),
  guarantee_card_image: z.string().optional(),
  notes: z.string().optional(),

  // Status is required with a default
  status: z.enum(['Pending', 'Approved']),
})

type AdminGuaranteeFormValues = z.infer<typeof adminGuaranteeSchema>

interface ProductLookupResult {
  id: number
  name: string
  category_name: string
  default_guarantee_months: number
  golden_guarantee_months: number
  warranty?: {
    manufacture_year: number
    manufacture_month_name: string
    season_name: string
    message: string
    message_type: 'success' | 'warning' | 'error'
  }
}

interface AdminGuaranteeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
}

export function AdminGuaranteeForm({ open, onOpenChange, onSubmit, isLoading }: AdminGuaranteeFormProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isLookupLoading, setIsLookupLoading] = useState(false)

  // File upload state
  const [isUploading, setIsUploading] = useState(false)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null)
  const [cardFile, setCardFile] = useState<File | null>(null)
  const [cardPreview, setCardPreview] = useState<string | null>(null)

  const invoiceInputRef = useRef<HTMLInputElement>(null)
  const cardInputRef = useRef<HTMLInputElement>(null)

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers-list-for-admin'],
    queryFn: () => customerService.list(1, 100).then(r => r.customers),
    enabled: open,
  })

  const form = useForm<AdminGuaranteeFormValues>({
    resolver: zodResolver(adminGuaranteeSchema),
    defaultValues: {
      customer_id: '',
      customer_full_name: '',
      customer_phone: '',
      customer_national_id: '',
      customer_province: '',
      customer_city: '',
      customer_address: '',
      guarantee_code: '',
      purchase_date: '',
      expiry_date: '',
      invoice_image: '',
      guarantee_card_image: '',
      notes: '',
      status: 'Approved',
    },
  })

  const guaranteeCode = form.watch('guarantee_code')
  const purchaseDate = form.watch('purchase_date')
  const debouncedCode = useDebounce(guaranteeCode, 500)

  // Product lookup by guarantee code
  const lookupProduct = async (code: string) => {
    if (!code || code.length < 3) {
      setLookupResult(null)
      setLookupError(null)
      return
    }

    setIsLookupLoading(true)
    setLookupError(null)
    setLookupResult(null)

    try {
      const response = await api.get('/products/public/lookup-by-code', {
        params: { code }
      })
      const product = response.data.data
      setLookupResult(product)
      setLookupError(null)
    } catch (error: any) {
      if (error.response?.status === 404) {
        setLookupError('No product matches this guarantee code')
      } else {
        setLookupError('Failed to lookup product')
      }
      setLookupResult(null)
    } finally {
      setIsLookupLoading(false)
    }
  }

  // Trigger lookup when debounced code changes
  useMemo(() => {
    if (debouncedCode && debouncedCode.length >= 3) {
      lookupProduct(debouncedCode)
    } else {
      setLookupResult(null)
      setLookupError(null)
    }
  }, [debouncedCode])

  useEffect(() => {
    if (lookupResult && purchaseDate) {
      const d = new Date(purchaseDate)
      d.setMonth(d.getMonth() + lookupResult.default_guarantee_months)
      form.setValue('expiry_date', d.toISOString().slice(0, 10))
    }
  }, [lookupResult, purchaseDate, form])

  useEffect(() => {
    if (!open) {
      form.reset()
      setActiveTab('existing')
      setSelectedCustomer(null)
      setLookupResult(null)
      setLookupError(null)
      setInvoiceFile(null)
      setInvoicePreview(null)
      setCardFile(null)
      setCardPreview(null)
    }
  }, [open, form])

  const handleFileUpload = async (file: File, type: 'invoice' | 'card') => {
    setIsUploading(true)
    try {
      const result = await publicGuaranteeService.uploadFile(file)
      if (type === 'invoice') {
        form.setValue('invoice_image', result.url)
        toast.success('Invoice uploaded successfully')
      } else {
        form.setValue('guarantee_card_image', result.url)
        toast.success('Guarantee card uploaded successfully')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit')
        return
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Allowed: JPEG, PNG, GIF, WEBP, PDF')
        return
      }
      setInvoiceFile(file)
      setInvoicePreview(URL.createObjectURL(file))
      handleFileUpload(file, 'invoice')
    }
  }

  const handleCardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit')
        return
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Allowed: JPEG, PNG, GIF, WEBP, PDF')
        return
      }
      setCardFile(file)
      setCardPreview(URL.createObjectURL(file))
      handleFileUpload(file, 'card')
    }
  }

  const removeInvoiceFile = () => {
    setInvoiceFile(null)
    setInvoicePreview(null)
    form.setValue('invoice_image', '')
    if (invoiceInputRef.current) {
      invoiceInputRef.current.value = ''
    }
  }

  const removeCardFile = () => {
    setCardFile(null)
    setCardPreview(null)
    form.setValue('guarantee_card_image', '')
    if (cardInputRef.current) {
      cardInputRef.current.value = ''
    }
  }

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => String(c.id) === customerId)
    if (customer) {
      setSelectedCustomer(customer)
      form.setValue('customer_full_name', customer.full_name)
      form.setValue('customer_phone', customer.phone)
      form.setValue('customer_national_id', customer.national_id)
      form.setValue('customer_province', customer.province || '')
      form.setValue('customer_city', customer.city || '')
      form.setValue('customer_address', customer.address || '')
    }
  }

  const handleSubmit = async (data: AdminGuaranteeFormValues) => {
    // Validate that product was found
    if (!lookupResult) {
      form.setError('guarantee_code', {
        type: 'manual',
        message: 'Please enter a valid guarantee code that matches a product'
      })
      return
    }

    // Build the submit data
    const submitData: any = {
      guarantee_code: data.guarantee_code,
      purchase_date: data.purchase_date,
      expiry_date: data.expiry_date,
      invoice_image: data.invoice_image || undefined,
      guarantee_card_image: data.guarantee_card_image || undefined,
      notes: data.notes || undefined,
      status: data.status || 'Approved',
    }

    // Handle customer selection based on active tab
    if (activeTab === 'existing' && data.customer_id && data.customer_id !== '') {
      submitData.customer_id = Number(data.customer_id)
    } else {
      // New customer - validate required fields
      if (!data.customer_full_name || !data.customer_phone || !data.customer_national_id) {
        form.setError('customer_full_name', {
          type: 'manual',
          message: 'Full name, phone, and national ID are required for new customer registration'
        })
        return
      }
      submitData.customer_full_name = data.customer_full_name
      submitData.customer_phone = data.customer_phone
      submitData.customer_national_id = data.customer_national_id
      submitData.customer_province = data.customer_province
      submitData.customer_city = data.customer_city
      submitData.customer_address = data.customer_address
    }

    await onSubmit(submitData)

    if (!isLoading) {
      form.reset()
      onOpenChange(false)
      setLookupResult(null)
      setInvoiceFile(null)
      setInvoicePreview(null)
      setCardFile(null)
      setCardPreview(null)
    }
  }

  const isLoadingData = customersLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Guarantee (Admin)</DialogTitle>
          <DialogDescription>
            Enter the guarantee code to automatically resolve the product.
            <br />
            <span className="text-sm font-medium text-blue-600">
              Guarantees created by admin are approved by default (unless set to Pending).
            </span>
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'existing' | 'new')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Existing Customer</TabsTrigger>
                  <TabsTrigger value="new">New Customer</TabsTrigger>
                </TabsList>

                <TabsContent value="existing" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="customer_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Customer *</FormLabel>
                        <Select
                          items={customers.map((c) => ({ value: String(c.id), label: `${c.full_name} - ${c.phone}` }))}
                          value={field.value || ''}
                          onValueChange={(value) => {
                            field.onChange(value)
                            if (value) {
                              handleCustomerSelect(value)
                            } else {
                              setSelectedCustomer(null)
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.full_name} - {c.phone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="new" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customer_full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone *</FormLabel>
                          <FormControl>
                            <Input placeholder="+1234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer_national_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>National ID *</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer_province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province</FormLabel>
                          <FormControl>
                            <Input placeholder="Province" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer_city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="customer_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Street, Building, Apartment..."
                            className="resize-none min-h-[60px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <Separator />

              {/* Guarantee Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Guarantee Information</h3>

                {/* Guarantee Code with Product Lookup */}
                <FormField
                  control={form.control}
                  name="guarantee_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guarantee Code (Printed on Product) *</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            placeholder="Enter the code from the product"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.value.toUpperCase())
                            }}
                          />
                          {isLookupLoading && (
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Checking code...
                            </p>
                          )}
                          {lookupResult && !lookupError && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                              <p className="font-medium">✓ Product Matched:</p>
                              <p>{lookupResult.name}</p>
                              <p className="text-xs text-green-600">{lookupResult.category_name}</p>
                              {lookupResult.warranty && (
                                <p className="text-xs text-green-600 mt-1">{lookupResult.warranty.message}</p>
                              )}
                            </div>
                          )}
                          {lookupError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                              <p className="font-medium">✗ {lookupError}</p>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => field.onChange(value as 'Pending' | 'Approved')}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Approved">Approved (Default)</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div></div> {/* Spacer */}

                  <FormField
                    control={form.control}
                    name="purchase_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Purchase Date *</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select purchase date"
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiry_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expiry Date *</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select expiry date"
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Invoice Upload */}
                  <div>
                    <FormLabel>Invoice Image</FormLabel>
                    <div className="mt-1">
                      {invoicePreview ? (
                        <div className="relative">
                          <div className="border rounded-lg p-2 bg-muted/30">
                            {invoiceFile?.type.startsWith('image/') ? (
                              <img
                                src={invoicePreview}
                                alt="Invoice preview"
                                className="w-full h-32 object-contain rounded"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-32">
                                <FileText className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={removeInvoiceFile}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          {isUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                              <Loader2 className="h-8 w-8 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                          onClick={() => invoiceInputRef.current?.click()}
                        >
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload invoice</p>
                          <p className="text-xs text-muted-foreground">JPEG, PNG, PDF (max 10MB)</p>
                        </div>
                      )}
                      <input
                        ref={invoiceInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                        className="hidden"
                        onChange={handleInvoiceFileChange}
                      />
                    </div>
                  </div>

                  {/* Guarantee Card Upload */}
                  <div>
                    <FormLabel>Guarantee Card Image</FormLabel>
                    <div className="mt-1">
                      {cardPreview ? (
                        <div className="relative">
                          <div className="border rounded-lg p-2 bg-muted/30">
                            {cardFile?.type.startsWith('image/') ? (
                              <img
                                src={cardPreview}
                                alt="Card preview"
                                className="w-full h-32 object-contain rounded"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-32">
                                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={removeCardFile}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          {isUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                              <Loader2 className="h-8 w-8 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                          onClick={() => cardInputRef.current?.click()}
                        >
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload card</p>
                          <p className="text-xs text-muted-foreground">JPEG, PNG, PDF (max 10MB)</p>
                        </div>
                      )}
                      <input
                        ref={cardInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                        className="hidden"
                        onChange={handleCardFileChange}
                      />
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes about this guarantee"
                          className="resize-none min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || isUploading || !lookupResult} className="bg-blue-600 hover:bg-blue-700">
                  {isLoading ? 'Creating...' : 'Create Guarantee'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}