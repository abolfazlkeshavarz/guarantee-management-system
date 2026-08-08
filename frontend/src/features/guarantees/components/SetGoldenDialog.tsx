import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { Guarantee, SetGoldenData } from '../types'
import { useCalendar } from '@/contexts/CalendarContext'
import { Sparkles, CalendarDays, ShoppingBag, CalendarClock } from 'lucide-react'

interface SetGoldenDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    guarantee: Guarantee | null
    onConfirm: (data: SetGoldenData) => Promise<void>
    isLoading?: boolean
}

export function SetGoldenDialog({ open, onOpenChange, guarantee, onConfirm, isLoading }: SetGoldenDialogProps) {
    const { t } = useTranslation()
    const { formatDate } = useCalendar()
    const [startDateType, setStartDateType] = useState<'today' | 'purchase_date' | 'custom'>('today')
    const [customDate, setCustomDate] = useState('')
    const [goldenMonths, setGoldenMonths] = useState(3)

    useEffect(() => {
        if (open) {
            setStartDateType('today')
            setCustomDate('')
            setGoldenMonths(3)
        }
    }, [open])

    const getStartDate = (): Date => {
        if (startDateType === 'today') return new Date()
        if (startDateType === 'purchase_date' && guarantee) return new Date(guarantee.purchase_date + 'T00:00:00')
        if (startDateType === 'custom' && customDate) return new Date(customDate + 'T00:00:00')
        return new Date()
    }

    const startDate = getStartDate()
    const goldenEnd = new Date(startDate)
    goldenEnd.setMonth(goldenEnd.getMonth() + goldenMonths)
    const normalStart = goldenEnd
    const normalEnd = guarantee ? new Date(guarantee.expiry_date + 'T00:00:00') : new Date()

    const isCustomIncomplete = startDateType === 'custom' && !customDate
    const exceedsExpiry = guarantee ? goldenEnd > new Date(guarantee.expiry_date + 'T00:00:00') : false

    const handleSubmit = async () => {
        await onConfirm({
            start_date_type: startDateType,
            custom_start_date: startDateType === 'custom' ? customDate : undefined,
            golden_months: goldenMonths,
        })
    }

    const typeButtons: { key: 'today' | 'purchase_date' | 'custom'; label: string; icon: React.ElementType }[] = [
        { key: 'today', label: t('guarantees.setGoldenDialog.today'), icon: CalendarDays },
        { key: 'purchase_date', label: t('guarantees.setGoldenDialog.purchaseDate'), icon: ShoppingBag },
        { key: 'custom', label: t('guarantees.setGoldenDialog.custom'), icon: CalendarClock },
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        {t('guarantees.setGoldenDialog.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('guarantees.setGoldenDialog.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Start date type */}
                    <div className="space-y-2">
                        <Label>{t('guarantees.setGoldenDialog.startDateType')}</Label>
                        <div className="flex gap-2">
                            {typeButtons.map(({ key, label, icon: Icon }) => (
                                <Button
                                    key={key}
                                    type="button"
                                    variant={startDateType === key ? 'default' : 'outline'}
                                    size="sm"
                                    className={startDateType === key ? 'bg-amber-600 hover:bg-amber-700' : ''}
                                    onClick={() => setStartDateType(key)}
                                >
                                    <Icon className="me-1.5 h-3.5 w-3.5" />
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Custom calendar picker */}
                    {startDateType === 'custom' && (
                        <div className="space-y-2">
                            <Label>{t('guarantees.setGoldenDialog.customDate')}</Label>
                            <DatePicker
                                value={customDate}
                                onChange={(date) => setCustomDate(date || '')}
                                placeholder={t('guarantees.setGoldenDialog.customDate')}
                            />
                        </div>
                    )}

                    {/* Duration dropdown */}
                    <div className="space-y-2">
                        <Label>{t('guarantees.setGoldenDialog.goldenMonths')}</Label>
                        <Select value={String(goldenMonths)} onValueChange={(v) => setGoldenMonths(Number(v))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="3">{t('guarantees.setGoldenDialog.months3')}</SelectItem>
                                <SelectItem value="6">{t('guarantees.setGoldenDialog.months6')}</SelectItem>
                                <SelectItem value="12">{t('guarantees.setGoldenDialog.months12')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Preview - uses formatDate from calendar context so it respects Jalali/Gregorian */}
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                        <p className="text-sm font-semibold text-amber-700">{t('guarantees.setGoldenDialog.preview')}</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-xs text-muted-foreground">{t('guarantees.setGoldenDialog.goldenStartPreview')}</p>
                                <p className="font-medium text-amber-700">{formatDate(startDate, 'full')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t('guarantees.setGoldenDialog.goldenEndPreview')}</p>
                                <p className="font-medium text-amber-700">{formatDate(goldenEnd, 'full')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t('guarantees.setGoldenDialog.normalStartPreview')}</p>
                                <p className="font-medium text-slate-700">{formatDate(normalStart, 'full')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t('guarantees.setGoldenDialog.normalEndPreview')}</p>
                                <p className="font-medium text-slate-700">{formatDate(normalEnd, 'full')}</p>
                            </div>
                        </div>
                        {exceedsExpiry && (
                            <p className="text-xs text-red-600 font-medium">
                                {t('guarantees.setGoldenDialog.exceedsExpiry')}
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading || isCustomIncomplete || exceedsExpiry}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        <Sparkles className="me-2 h-4 w-4" />
                        {t('guarantees.setGoldenDialog.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}