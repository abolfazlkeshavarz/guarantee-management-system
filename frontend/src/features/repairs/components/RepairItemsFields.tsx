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

/** One line of a part request that has reached the technician. */
export interface DeliveredPart {
  itemId: number
  requestId: number
  catalogId: number
  name: string
  quantity: number
}

interface RepairItemsFieldsProps {
  control: Control<any>
  components: RepairCatalogEntry[]
  services: RepairCatalogEntry[]
  /**
   * When given, component lines are chosen from these delivered parts instead
   * of from the whole catalog -- the technician can only report parts that
   * were actually issued to them. Omitted on the admin path, which files
   * repairs against the catalog directly.
   */
  deliveredComponents?: DeliveredPart[]
  deliveredServices?: DeliveredPart[]
}

export function RepairItemsFields({
  control,
  components,
  services,
  deliveredComponents,
  deliveredServices,
}: RepairItemsFieldsProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const componentsArray = useFieldArray({ control, name: 'components' })
  const servicesArray = useFieldArray({ control, name: 'services' })
  const fromDelivery = deliveredComponents !== undefined

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
              <div className="w-64">
                {fromDelivery ? (
                  <DeliveredSelect
                    control={control}
                    idName={`components.${index}.component_id`}
                    linkName={`components.${index}.component_request_item_id`}
                    options={deliveredComponents ?? []}
                    placeholder={t('repairItems.selectDeliveredPart')}
                    emptyLabel={t('repairItems.noDeliveredParts')}
                  />
                ) : (
                  <FieldSelect
                    control={control}
                    name={`components.${index}.component_id`}
                    options={components}
                    placeholder={t('repairItems.selectComponent')}
                  />
                )}
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
              <div className="w-64">
                {deliveredServices && deliveredServices.length > 0 ? (
                  <DeliveredSelect
                    control={control}
                    idName={`services.${index}.service_id`}
                    linkName={`services.${index}.component_request_item_id`}
                    options={deliveredServices}
                    placeholder={t('repairItems.selectService')}
                    emptyLabel={t('repairItems.noDeliveredParts')}
                    catalogFallback={services}
                  />
                ) : (
                  <FieldSelect
                    control={control}
                    name={`services.${index}.service_id`}
                    options={services}
                    placeholder={t('repairItems.selectService')}
                  />
                )}
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

/**
 * Picks a delivered part-request line, and writes both halves of the answer:
 * the catalog id the report needs, and the request line the part came from.
 * Keeping them in step here is what makes the link trustworthy -- the server
 * rejects a line whose two halves disagree.
 */
function DeliveredSelect({
  control,
  idName,
  linkName,
  options,
  placeholder,
  emptyLabel,
  catalogFallback,
}: {
  control: Control<any>
  idName: string
  linkName: string
  options: DeliveredPart[]
  placeholder: string
  emptyLabel: string
  catalogFallback?: RepairCatalogEntry[]
}) {
  const { field: idField } = useController({ control, name: idName })
  const { field: linkField } = useController({ control, name: linkName })
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  // A delivered line is identified by its own id, not the catalog id: the same
  // part can be delivered more than once, and each delivery is a separate row.
  const items = options.map((o) => ({
    value: String(o.itemId),
    label: `${o.name} — #${o.requestId}${o.quantity > 1 ? ` ×${o.quantity}` : ''}`,
  }))
  const fallbackItems = (catalogFallback ?? []).map((c) => ({
    value: `catalog:${c.id}`,
    label: c.name,
  }))
  const allItems = [...items, ...fallbackItems]

  if (allItems.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  const selected = linkField.value
    ? String(linkField.value)
    : idField.value
      ? `catalog:${idField.value}`
      : ''

  const handleChange = (value: string | null) => {
    if (!value) return
    if (value.startsWith('catalog:')) {
      idField.onChange(Number(value.slice('catalog:'.length)))
      linkField.onChange(undefined)
      return
    }
    const picked = options.find((o) => String(o.itemId) === value)
    if (!picked) return
    idField.onChange(picked.catalogId)
    linkField.onChange(picked.itemId)
  }

  return (
    <Select items={allItems} value={selected} onValueChange={handleChange}>
      <SelectTrigger className={`w-full ${isRTL ? 'text-right' : ''}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={isRTL ? 'text-right' : ''}>
        {allItems.map((o) => (
          <SelectItem key={o.value} value={o.value} className={isRTL ? 'text-right' : ''}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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