import { useFieldArray, useController, Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { RepairCatalogEntry } from '@/features/repairCatalog/types'

interface RepairItemsFieldsProps {
  control: Control<any>
  components: RepairCatalogEntry[]
  services: RepairCatalogEntry[]
}

export function RepairItemsFields({ control, components, services }: RepairItemsFieldsProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const componentsArray = useFieldArray({ control, name: 'components' })
  const servicesArray = useFieldArray({ control, name: 'services' })

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Label>{t('repairItems.componentsReplaced')}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => componentsArray.append({ component_id: 0, report: '' })}
            className={isRTL ? 'flex-row-reverse' : ''}
          >
            <Plus className={`h-3 w-3 ${isRTL ? 'ml-1' : 'me-1'}`} />
            {t('repairItems.addComponent')}
          </Button>
        </div>
        {componentsArray.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('repairItems.noComponents')}</p>
        )}
        <div className="space-y-2">
          {componentsArray.fields.map((field, index) => (
            <div key={field.id} className={`flex gap-2 items-start border rounded-md p-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-48">
                <FieldSelect
                  control={control}
                  name={`components.${index}.component_id`}
                  options={components}
                  placeholder={t('repairItems.selectComponent')}
                />
              </div>
              <FieldTextarea
                control={control}
                name={`components.${index}.report`}
                placeholder={t('repairItems.componentReportPlaceholder')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => componentsArray.remove(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Label>{t('repairItems.servicesPerformed')}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => servicesArray.append({ service_id: 0, report: '' })}
            className={isRTL ? 'flex-row-reverse' : ''}
          >
            <Plus className={`h-3 w-3 ${isRTL ? 'ml-1' : 'me-1'}`} />
            {t('repairItems.addService')}
          </Button>
        </div>
        {servicesArray.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('repairItems.noServices')}</p>
        )}
        <div className="space-y-2">
          {servicesArray.fields.map((field, index) => (
            <div key={field.id} className={`flex gap-2 items-start border rounded-md p-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-48">
                <FieldSelect
                  control={control}
                  name={`services.${index}.service_id`}
                  options={services}
                  placeholder={t('repairItems.selectService')}
                />
              </div>
              <FieldTextarea
                control={control}
                name={`services.${index}.report`}
                placeholder={t('repairItems.serviceReportPlaceholder')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => servicesArray.remove(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Small local helpers so each row can register itself with react-hook-form
// without needing the parent to wire up a <FormField> for every dynamic row.
function FieldSelect({
  control,
  name,
  options,
  placeholder,
}: {
  control: Control<any>
  name: string
  options: RepairCatalogEntry[]
  placeholder: string
}) {
  const { field } = useController({ control, name })
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  return (
    <Select
      items={options.map((o) => ({ value: String(o.id), label: o.name }))}
      value={field.value ? String(field.value) : ''}
      onValueChange={(value) => field.onChange(Number(value))}
    >
      <SelectTrigger className={`w-full ${isRTL ? 'text-right' : ''}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={isRTL ? 'text-right' : ''}>
        {options.map((o) => (
          <SelectItem key={o.id} value={String(o.id)} className={isRTL ? 'text-right' : ''}>{o.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function FieldTextarea({
  control,
  name,
  placeholder,
}: {
  control: Control<any>
  name: string
  placeholder: string
}) {
  const { field } = useController({ control, name })
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  return (
    <Textarea
      {...field}
      placeholder={placeholder}
      className={`flex-1 min-h-[40px] resize-none ${isRTL ? 'text-right' : ''}`}
      rows={1}
    />
  )
}