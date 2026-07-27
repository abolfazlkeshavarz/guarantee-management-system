import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { publicGuaranteeService } from '../api/publicGuarantee'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GuaranteeStatusBadge } from '../components/GuaranteeStatusBadge'
import { Search, ShieldCheck, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export function CheckGuaranteePage() {
  const [code, setCode] = useState('')
  const [searchCode, setSearchCode] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['check-guarantee', searchCode],
    queryFn: () => publicGuaranteeService.checkStatus(searchCode),
    enabled: false,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim()) {
      setSearchCode(code.trim())
      refetch()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Check Guarantee Status</CardTitle>
            <CardDescription>
              Enter your guarantee code to check its current status
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Enter guarantee code (e.g., GUA-XXXXXX)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Checking...' : 'Check'}
              </Button>
            </form>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Guarantee not found. Please check the code and try again.
                </AlertDescription>
              </Alert>
            )}

            {data && (
              <div className="mt-6 space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Guarantee Code</p>
                      <p className="font-mono font-semibold">{data.code}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <GuaranteeStatusBadge status={data.status} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Customer</p>
                      <p>{data.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Product</p>
                      <p>{data.product_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
                      <p>{format(new Date(data.purchase_date), 'MMMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Expiry Date</p>
                      <p className={new Date(data.expiry_date) < new Date() ? 'text-red-600 font-medium' : ''}>
                        {format(new Date(data.expiry_date), 'MMMM d, yyyy')}
                        {new Date(data.expiry_date) < new Date() && ' (Expired)'}
                      </p>
                    </div>
                  </div>
                </div>

                {data.notes && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm">{data.notes}</p>
                  </div>
                )}

                {data.approved_at && (
                  <p className="text-xs text-muted-foreground">
                    Approved on: {format(new Date(data.approved_at), 'MMMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="link" onClick={() => window.location.href = '/register-guarantee'}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Register a new guarantee
          </Button>
        </div>
      </div>
    </div>
  )
}