import { useFieldArray, useController, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import type { RepairCatalogEntry } from '@/features/repairCatalog/types'

interface PartRequestItemsFieldsProps {
  control: Control<any>
  components: RepairCatalogEntry[]
  services: RepairCatalogEntry[]
}

/**
 * The repeatable list of requested items.
 *
 * Each row picks its own type (catalog component, catalog service, or
 * free text) and quantity, so one request can mix a part from the catalog
 * with something that isn't in it yet.
 */
export function PartRequestItemsFields({
  control,
  components,
  services,
}: PartRequestItemsFieldsProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  return (
    <div className="space-y-3">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Label>{t('partRequests.itemsLabel')}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ item_type: 'component', item_id: undefined, custom_item_name: '', quantity: 1 })
          }
        >
          <Plus className="me-2 h-4 w-4" />
          {t('partRequests.addItem')}
        </Button>
      </div>

      {fields.length === 0 && (
        <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
          {t('partRequests.noItems')}
        </p>
      )}

      {fields.map((field, index) => (
        <ItemRow
          key={field.id}
          control={control}
          index={index}
          components={components}
          services={services}
          onRemove={() => remove(index)}
          canRemove={fields.length > 1}
        />
      ))}
    </div>
  )
}

function ItemRow({
  control,
  index,
  components,
  services,
  onRemove,
  canRemove,
}: {
  control: Control<any>
  index: number
  components: RepairCatalogEntry[]
  services: RepairCatalogEntry[]
  onRemove: () => void
  canRemove: boolean
}) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  const typeCtl = useController({ control, name: `items.${index}.item_type` })
  const idCtl = useController({ control, name: `items.${index}.item_id` })
  const nameCtl = useController({ control, name: `items.${index}.custom_item_name` })
  const qtyCtl = useController({ control, name: `items.${index}.quantity` })

  const itemType = typeCtl.field.value ?? 'component'
  const catalog = itemType === 'service' ? services : components
  const isCustom = itemType === 'custom'

  const typeOptions = [
    { value: 'component', label: t('partRequests.itemType.component') },
    { value: 'service', label: t('partRequests.itemType.service') },
    { value: 'custom', label: t('partRequests.notInList') },
  ]

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="w-[150px] space-y-1">
          <Label className="text-xs">{t('partRequests.itemTypeLabel')}</Label>
          <Select
            items={typeOptions}
            value={itemType}
            onValueChange={(value) => {
              typeCtl.field.onChange(value)
              // The previous pick is meaningless once the type changes.
              idCtl.field.onChange(undefined)
              nameCtl.field.onChange('')
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={isRTL ? 'text-right' : ''}>
              {typeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-1">
          <Label className="text-xs">{t('partRequests.table.item')}</Label>
          {isCustom ? (
            <Input
              value={nameCtl.field.value ?? ''}
              onChange={(e) => nameCtl.field.onChange(e.target.value)}
              placeholder={t('partRequests.customItemPlaceholder')}
              className={isRTL ? 'text-right' : ''}
            />
          ) : (
            <Select
              items={catalog.map((entry) => ({ value: String(entry.id), label: entry.name }))}
              value={idCtl.field.value ? String(idCtl.field.value) : ''}
              onValueChange={(value) => idCtl.field.onChange(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('partRequests.selectItem')} />
              </SelectTrigger>
              <SelectContent className={isRTL ? 'text-right' : ''}>
                {catalog.map((entry) => (
                  <SelectItem key={entry.id} value={String(entry.id)}>
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(idCtl.fieldState.error || nameCtl.fieldState.error) && (
            <p className="text-xs text-destructive">
              {idCtl.fieldState.error?.message || nameCtl.fieldState.error?.message}
            </p>
          )}
        </div>

        <div className="w-[100px] space-y-1">
          <Label className="text-xs">{t('partRequests.table.quantity')}</Label>
          <Input
            type="number"
            min={1}
            max={999}
            value={qtyCtl.field.value ?? 1}
            onChange={(e) => qtyCtl.field.onChange(Number(e.target.value))}
            className={isRTL ? 'text-right' : ''}
          />
        </div>

        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-5 text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
