import { api } from '@/api/axios'

export interface PublicRegisterData {
  // Customer
  full_name: string
  phone: string
  national_id: string
  province: string
  city: string
  address: string
  // Guarantee
  guarantee_code: string
  product_name: string
  purchase_date: string
  guarantee_period: number
  invoice_image?: string
  guarantee_card_image?: string
  notes?: string
}

export interface PublicRegisterResponse {
  guarantee_id: number
  guarantee_code: string
  customer_id: number
  customer_name: string
  expiry_date: string
  status: string
  message: string
}

export interface GuaranteePeriod {
  value: number
  label: string
  months: number
}

export const publicGuaranteeService = {
  async register(data: PublicRegisterData): Promise<PublicRegisterResponse> {
    const response = await api.post('/guarantees/public/register', data)
    return response.data.data
  },

  async getPeriods(): Promise<GuaranteePeriod[]> {
    const response = await api.get('/guarantees/public/periods')
    return response.data.data
  },

  async checkStatus(code: string): Promise<any> {
    const response = await api.get('/guarantees/public/check', { params: { code } })
    return response.data.data
  },

  async uploadFile(file: File): Promise<{ url: string; filename: string; size: number; type: string }> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/guarantees/public/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  },
}