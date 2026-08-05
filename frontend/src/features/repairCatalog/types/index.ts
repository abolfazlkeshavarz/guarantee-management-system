export interface RepairCatalogEntry {
  id: number
  name: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RepairCatalogFormData {
  name: string
  description?: string
  is_active?: boolean
}

export interface RepairComponentListResponse {
  components: RepairCatalogEntry[]
  total: number
  page: number
  limit: number
  last_page: number
}

export interface RepairServiceListResponse {
  services: RepairCatalogEntry[]
  total: number
  page: number
  limit: number
  last_page: number
}
