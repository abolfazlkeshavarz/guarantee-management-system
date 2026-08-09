import { useState, useRef, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { publicGuaranteeService } from '../api/publicGuarantee'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { api } from '@/api/axios'
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
import { DatePicker } from '@/components/ui/date-picker'
import { useDebounce } from '@/hooks/useDebounce'

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
  purchase_date: z.string().min(1, 'Purchase date is required'),
  guarantee_period: z.number().min(1, 'Please select a guarantee period'),
  invoice_image: z.string().optional(),
  guarantee_card_image: z.string().optional(),
  notes: z.string().optional(),
})

type PublicRegisterFormValues = z.infer<typeof publicRegisterSchema>

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

export function PublicRegisterPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean
    message: string
    data?: any
  } | null>(null)

  const [lookupError, setLookupError] = useState<string | null>(null)
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null)
  const [isLookupLoading, setIsLookupLoading] = useState(false)

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
      purchase_date: '',
      guarantee_period: 0,
      invoice_image: '',
      guarantee_card_image: '',
      notes: '',
    },
  })

  // Debounced guarantee code lookup
  const guaranteeCode = form.watch('guarantee_code')
  const debouncedCode = useDebounce(guaranteeCode, 500)

  // Product lookup by guarantee code
  const lookupProduct = useCallback(async (code: string) => {
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
      form.setValue('guarantee_period', product.default_guarantee_months)
      toast.success(`Product matched: ${product.name}`)
    } catch (error: any) {
      if (error.response?.status === 404) {
        setLookupError('No product matches this guarantee code. Please check the code.')
      } else {
        setLookupError('Failed to lookup product. Please try again.')
      }
      setLookupResult(null)
    } finally {
      setIsLookupLoading(false)
    }
  }, [form])

  // Trigger lookup when debounced code changes
  useMemo(() => {
    if (debouncedCode && debouncedCode.length >= 3) {
      lookupProduct(debouncedCode)
    } else {
      setLookupResult(null)
      setLookupError(null)
    }
  }, [debouncedCode, lookupProduct])

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
    // Validate that product was found
    if (!lookupResult) {
      toast.error('Please enter a valid guarantee code that matches a product')
      return
    }

    setIsSubmitting(true)
    setRegistrationResult(null)

    try {
      // Clean up data - remove product_name (not needed anymore)
      const cleanedData = {
        ...data,
        invoice_image: data.invoice_image || undefined,
        guarantee_card_image: data.guarantee_card_image || undefined,
        notes: data.notes || undefined,
        // product_name is removed - backend resolves from guarantee_code
      }

      const response = await publicGuaranteeService.register(cleanedData)

      setRegistrationResult({
        success: true,
        message: response.message || 'Guarantee registered successfully!',
        data: response,
      })

      toast.success('Guarantee registered successfully!')
      form.reset()
      setInvoiceFile(null)
      setInvoicePreview(null)
      setInvoiceUploadedUrl('')
      setCardFile(null)
      setCardPreview(null)
      setCardUploadedUrl('')
      setLookupResult(null)

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
                  setLookupResult(null)
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
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{t('public.register.title')}</CardTitle>
            <CardDescription className="text-base">
              {t('public.register.subtitle')}
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
                    {t('public.register.customerInfo')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('public.register.fullName')} *</FormLabel>
                          <FormControl>
                            <Input placeholder={t('public.register.fullName')} {...field} />
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
                          <FormLabel>{t('public.register.phoneNumber')} *</FormLabel>
                          <FormControl>
                            <Input placeholder="09123456789" {...field} />
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
                          <FormLabel>{t('public.register.nationalId')} *</FormLabel>
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
                          <FormLabel>{t('public.register.province')} *</FormLabel>
                          <FormControl>
                            <Input placeholder={t('public.register.province')} {...field} />
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
                          <FormLabel>{t('public.register.city')} *</FormLabel>
                          <FormControl>
                            <Input placeholder={t('public.register.city')} {...field} />
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
                        <FormLabel>{t('public.register.address')} *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('public.register.address')}
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
                    {t('public.register.guaranteeInfo')}
                  </h3>

                  <div className="space-y-4">
                    {/* Guarantee Code with Product Lookup */}
                    <FormField
                      control={form.control}
                      name="guarantee_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('public.register.guaranteeCode')} *</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Input
                                placeholder="Enter the code from your product"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="purchase_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>{t('public.register.purchaseDate')} *</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value}
                                onChange={field.onChange}
                                placeholder={t('public.register.purchaseDate')}
                                className="w-full"
                              />
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
                            <FormLabel>{t('public.register.guaranteePeriod')} *</FormLabel>
                            <Select
                              items={periods.map((period) => ({ value: String(period.value), label: period.label }))}
                              value={field.value ? String(field.value) : ''}
                              onValueChange={(value) => field.onChange(Number(value))}
                              disabled={periodsLoading || !!lookupResult}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder={t('public.register.guaranteePeriod')} />
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
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Invoice Upload */}
                  <div>
                    <FormLabel>{t('public.register.invoiceImage')}</FormLabel>
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
                              className="absolute top-1 end-1 h-6 w-6 p-0"
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
                    <FormLabel>{t('public.register.guaranteeCardImage')}</FormLabel>
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
                              className="absolute top-1 end-1 h-6 w-6 p-0"
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
                      <FormLabel>{t('public.register.notes')}</FormLabel>
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
              </form>
            </Form>

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
                  {t('public.register.cancel')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || isUploading || !lookupResult}
                  onClick={form.handleSubmit(onSubmit)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t('public.register.submitting')}
                    </>
                  ) : (
                    t('public.register.submit')
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>{t('public.register.alreadyRegistered')} <a href="/check-guarantee" className="text-primary hover:underline">{t('public.register.checkStatusLink')}</a></p>
        </div>
      </div>
    </div>
  )
}