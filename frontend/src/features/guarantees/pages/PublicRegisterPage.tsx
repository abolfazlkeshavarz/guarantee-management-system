import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { publicGuaranteeService } from '../api/publicGuarantee'
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, Upload, X, FileText, Image } from 'lucide-react'

const publicRegisterSchema = z.object({
  // Customer
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Phone number must be at least 10 characters').max(20),
  national_id: z.string().min(6, 'National ID must be at least 6 characters').max(20),
  province: z.string().min(2, 'Province is required').max(50),
  city: z.string().min(2, 'City is required').max(50),
  address: z.string().min(5, 'Address is required'),
  
  // Guarantee
  guarantee_code: z.string().min(3, 'Guarantee code is required').max(50),
  product_name: z.string().min(2, 'Product name is required').max(100),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  guarantee_period: z.number().min(1, 'Please select a guarantee period'),
  invoice_image: z.string().optional(),
  guarantee_card_image: z.string().optional(),
  notes: z.string().optional(),
})

type PublicRegisterFormValues = z.infer<typeof publicRegisterSchema>

export function PublicRegisterPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean
    message: string
    data?: any
  } | null>(null)
  
  // File upload states
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null)
  const [invoiceUploadedUrl, setInvoiceUploadedUrl] = useState<string>('')
  const [cardFile, setCardFile] = useState<File | null>(null)
  const [cardPreview, setCardPreview] = useState<string | null>(null)
  const [cardUploadedUrl, setCardUploadedUrl] = useState<string>('')
  
  const invoiceInputRef = useRef<HTMLInputElement>(null)
  const cardInputRef = useRef<HTMLInputElement>(null)

  const { data: periods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ['guarantee-periods'],
    queryFn: publicGuaranteeService.getPeriods,
  })

  const form = useForm<PublicRegisterFormValues>({
    resolver: zodResolver(publicRegisterSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      national_id: '',
      province: '',
      city: '',
      address: '',
      guarantee_code: '',
      product_name: '',
      purchase_date: '',
      guarantee_period: 0,
      invoice_image: '',
      guarantee_card_image: '',
      notes: '',
    },
  })

  const handleFileUpload = async (file: File, type: 'invoice' | 'card') => {
    setIsUploading(true)
    try {
      const result = await publicGuaranteeService.uploadFile(file)
      
      if (type === 'invoice') {
        setInvoiceUploadedUrl(result.url)
        form.setValue('invoice_image', result.url)
        toast.success('Invoice uploaded successfully')
      } else {
        setCardUploadedUrl(result.url)
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
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit')
        return
      }
      
      // Validate file type
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
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit')
        return
      }
      
      // Validate file type
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
    setInvoiceUploadedUrl('')
    form.setValue('invoice_image', '')
    if (invoiceInputRef.current) {
      invoiceInputRef.current.value = ''
    }
  }

  const removeCardFile = () => {
    setCardFile(null)
    setCardPreview(null)
    setCardUploadedUrl('')
    form.setValue('guarantee_card_image', '')
    if (cardInputRef.current) {
      cardInputRef.current.value = ''
    }
  }

  const onSubmit = async (data: PublicRegisterFormValues) => {
    setIsSubmitting(true)
    setRegistrationResult(null)
    
    try {
      // Clean up data
      const cleanedData = {
        ...data,
        invoice_image: data.invoice_image || undefined,
        guarantee_card_image: data.guarantee_card_image || undefined,
        notes: data.notes || undefined,
      }
      
      const response = await publicGuaranteeService.register(cleanedData)
      setRegistrationResult({
        success: true,
        message: response.message || 'Guarantee registered successfully!',
        data: response,
      })
      toast.success('Guarantee registered successfully!')
      
      // Reset form after successful registration
      form.reset()
      setInvoiceFile(null)
      setInvoicePreview(null)
      setInvoiceUploadedUrl('')
      setCardFile(null)
      setCardPreview(null)
      setCardUploadedUrl('')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to register guarantee'
      setRegistrationResult({
        success: false,
        message: errorMessage,
      })
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (registrationResult?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Registration Successful!</CardTitle>
            <CardDescription>
              Your guarantee has been registered and is pending admin approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">Guarantee Code</span>
                <span className="font-mono font-semibold">{registrationResult.data?.guarantee_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">Customer</span>
                <span>{registrationResult.data?.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">Expiry Date</span>
                <span>{registrationResult.data?.expiry_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pending Approval
                </span>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your guarantee is pending admin approval. You will be notified once it's approved.
                You can check the status using your guarantee code.
              </AlertDescription>
            </Alert>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setRegistrationResult(null)
                  form.reset()
                }}
              >
                Register Another
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate('/')}
              >
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Guarantee Registration</CardTitle>
            <CardDescription className="text-base">
              Register your product guarantee. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {registrationResult?.success === false && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{registrationResult.message}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Customer Information Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">1</span>
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
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
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
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
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province *</FormLabel>
                          <FormControl>
                            <Input placeholder="Province" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
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
                    name="address"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Full Address *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Street, Building, Apartment..."
                            className="resize-none min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Guarantee Information Section */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">2</span>
                    Guarantee Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="guarantee_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guarantee Code (Printed on Product) *</FormLabel>
                          <FormControl>
                            <Input placeholder="GUA-XXXXXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="product_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Product Model/Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="purchase_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guarantee_period"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guarantee Period *</FormLabel>
                          <Select
                            value={field.value ? String(field.value) : ''}
                            onValueChange={(value) => field.onChange(Number(value))}
                            disabled={periodsLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select guarantee period" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {periods.map((period) => (
                                <SelectItem key={period.value} value={String(period.value)}>
                                  {period.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* File Upload Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                                  <Image className="h-12 w-12 text-muted-foreground" />
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
                      <FormItem className="mt-4">
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional information about your product or guarantee..."
                            className="resize-none min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 border-t">
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your guarantee will be pending admin approval. You will receive a confirmation once approved.
                      Make sure all information is accurate.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate('/')}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1" 
                      disabled={isSubmitting || isUploading}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        'Register Guarantee'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Already have a registered guarantee? <a href="/check-guarantee" className="text-primary hover:underline">Check status</a></p>
        </div>
      </div>
    </div>
  )
}