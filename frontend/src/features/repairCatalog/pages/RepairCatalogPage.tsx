import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RepairCatalogPanel } from '../components/RepairCatalogPanel'
import { repairComponentService, repairServiceCatalogService } from '../api/repairCatalog'

export function RepairCatalogPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('repairCatalog.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('repairCatalog.subtitle')}</p>
      </div>

      <Tabs defaultValue="components">
        <TabsList>
          <TabsTrigger value="components">{t('repairCatalog.components')}</TabsTrigger>
          <TabsTrigger value="services">{t('repairCatalog.services')}</TabsTrigger>
        </TabsList>
        <TabsContent value="components" className="mt-4">
          <RepairCatalogPanel
            service={repairComponentService}
            queryKey="repair-components-admin"
            entriesField="components"
            addLabel={t('repairCatalog.addComponent')}
            createTitle={t('repairCatalog.addComponent')}
            editTitle={t('repairCatalog.editComponent')}
            namePlaceholder="e.g. Power Board"
            searchPlaceholder={t('common.search')}
          />
        </TabsContent>
        <TabsContent value="services" className="mt-4">
          <RepairCatalogPanel
            service={repairServiceCatalogService}
            queryKey="repair-services-admin"
            entriesField="services"
            addLabel={t('repairCatalog.addService')}
            createTitle={t('repairCatalog.addService')}
            editTitle={t('repairCatalog.editService')}
            namePlaceholder="e.g. Cleaning"
            searchPlaceholder={t('common.search')}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
