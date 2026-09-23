import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Plus, Trash2, Users, Loader2 } from 'lucide-react'
import { productService } from '@/features/products/api/products'
import { smsTemplateService } from '@/features/smsTemplates/api/smsTemplates'
import { pollService } from '../api/polls'
import { CreatePollData, Poll, QUESTION_KINDS, QuestionInput, QuestionKind, LinkMode } from '../types'

interface PollFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = new poll. */
  poll: Poll | null
  onSubmit: (data: CreatePollData) => Promise<void>
  isLoading?: boolean
}

const blankQuestion = (): QuestionInput => ({
  text: '',
  kind: 'rating',
  options: [],
  required: true,
})

export function PollFormDialog({
  open,
  onOpenChange,
  poll,
  onSubmit,
  isLoading,
}: PollFormDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [smsKey, setSmsKey] = useState('')
  const [offerKey, setOfferKey] = useState('')
  const [linkMode, setLinkMode] = useState<LinkMode>('url')
  const [questions, setQuestions] = useState<QuestionInput[]>([blankQuestion()])

  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [productId, setProductId] = useState<string>('all')
  const [purchasedBefore, setPurchasedBefore] = useState('')
  const [expiryBefore, setExpiryBefore] = useState('')

  const [preview, setPreview] = useState<{ total: number; reachable: number } | null>(null)
  const [previewing, setPreviewing] = useState(false)

  const { data: products = [] } = useQuery({
    queryKey: ['products-for-polls'],
    queryFn: () => productService.list(1, 100).then((r) => r.products),
    enabled: open,
  })
  const { data: templates = [] } = useQuery({
    queryKey: ['sms-templates-usable'],
    queryFn: () => smsTemplateService.usable(),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setTitle(poll?.title ?? '')
    setDescription(poll?.description ?? '')
    setSmsKey(poll?.sms_template_key || 'poll_invite')
    setOfferKey(poll?.offer_sms_template_key || 'poll_offer')
    setLinkMode(poll?.link_mode ?? 'url')
    setQuestions(
      poll?.questions?.length
        ? poll.questions.map((q) => ({
            text: q.text,
            kind: q.kind,
            options: q.options,
            required: q.required,
          }))
        : [blankQuestion()]
    )
    setCity(poll?.filter_city ?? '')
    setProvince(poll?.filter_province ?? '')
    setProductId(poll?.filter_product_id ? String(poll.filter_product_id) : 'all')
    setPurchasedBefore(poll?.filter_purchased_before ?? '')
    setExpiryBefore(poll?.filter_expiry_before ?? '')
    setPreview(null)
  }, [open, poll])

  const filters = () => ({
    city: city.trim() || undefined,
    province: province.trim() || undefined,
    product_id: productId !== 'all' ? Number(productId) : undefined,
    purchased_before: purchasedBefore || undefined,
    expiry_before: expiryBefore || undefined,
  })

  const runPreview = async () => {
    setPreviewing(true)
    try {
      const result = await pollService.previewAudience(filters())
      setPreview({ total: result.total, reachable: result.reachable })
    } catch {
      setPreview(null)
    } finally {
      setPreviewing(false)
    }
  }

  const setQuestion = (index: number, patch: Partial<QuestionInput>) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))

  const isDraft = !poll || poll.status === 'Draft'
  const canSubmit =
    title.trim().length >= 2 &&
    questions.length > 0 &&
    questions.every((q) => q.text.trim().length >= 2) &&
    questions.every((q) => q.kind !== 'choice' || (q.options ?? []).filter(Boolean).length >= 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[680px] max-h-[92vh] overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {poll ? t('polls.form.editTitle') : t('polls.form.createTitle')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('polls.form.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>{t('polls.form.title')} *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
          </div>

          <div className="space-y-2">
            <Label>{t('polls.form.intro')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
              placeholder={t('polls.form.introPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('polls.form.introHint')}</p>
          </div>

          <Separator />

          {/* ── Who it goes to ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="font-medium">{t('polls.form.audienceTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('polls.form.audienceHint')}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('exports.city')}</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label>{t('exports.region')}</Label>
                <Input
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('exports.product')}</Label>
                <Select
                  items={[
                    { value: 'all', label: t('guarantees.allProducts') },
                    ...products.map((p: any) => ({ value: String(p.id), label: p.name })),
                  ]}
                  value={productId}
                  onValueChange={(v) => setProductId(v ?? 'all')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('guarantees.allProducts')}</SelectItem>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('polls.form.purchasedBefore')}</Label>
                <DatePicker
                  value={purchasedBefore}
                  onChange={(d) => setPurchasedBefore(d || '')}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('polls.form.expiryBefore')}</Label>
                <DatePicker
                  value={expiryBefore}
                  onChange={(d) => setExpiryBefore(d || '')}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={runPreview} disabled={previewing}>
                {previewing ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Users className="me-2 h-4 w-4" />
                )}
                {t('polls.form.preview')}
              </Button>
              {preview && (
                <p className="text-sm">
                  {t('polls.form.previewResult', {
                    total: preview.total,
                    reachable: preview.reachable,
                  })}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* ── Questions ──────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{t('polls.form.questionsTitle')}</h3>
              {isDraft && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuestions((prev) => [...prev, blankQuestion()])}
                  disabled={questions.length >= 20}
                >
                  <Plus className="me-2 h-4 w-4" />
                  {t('polls.form.addQuestion')}
                </Button>
              )}
            </div>
            {!isDraft && (
              <p className="text-xs text-amber-700">{t('polls.form.questionsLocked')}</p>
            )}

            {questions.map((q, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="mt-2 text-sm text-muted-foreground shrink-0">{index + 1}.</span>
                  <Input
                    value={q.text}
                    onChange={(e) => setQuestion(index, { text: e.target.value })}
                    placeholder={t('polls.form.questionPlaceholder')}
                    maxLength={300}
                    disabled={!isDraft}
                  />
                  {isDraft && questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive shrink-0"
                      onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 ps-6">
                  <Select
                    items={QUESTION_KINDS.map((k) => ({
                      value: k,
                      label: t(`polls.kind.${k}`),
                    }))}
                    value={q.kind}
                    onValueChange={(v) => setQuestion(index, { kind: (v as QuestionKind) || 'rating' })}
                    disabled={!isDraft}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`polls.kind.${k}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={q.required}
                      onChange={(e) => setQuestion(index, { required: e.target.checked })}
                      disabled={!isDraft}
                    />
                    {t('polls.form.required')}
                  </label>
                </div>

                {q.kind === 'choice' && (
                  <div className="ps-6 space-y-1">
                    <Label className="text-xs">{t('polls.form.options')}</Label>
                    <Textarea
                      value={(q.options ?? []).join('\n')}
                      onChange={(e) =>
                        setQuestion(index, { options: e.target.value.split('\n') })
                      }
                      rows={3}
                      className="resize-none"
                      placeholder={t('polls.form.optionsPlaceholder')}
                      disabled={!isDraft}
                    />
                    <p className="text-xs text-muted-foreground">{t('polls.form.optionsHint')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* ── How it is sent ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="font-medium">{t('polls.form.smsTitle')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('polls.form.invitePattern')}</Label>
                <Select
                  items={templates.map((tpl) => ({ value: tpl.key, label: tpl.title }))}
                  value={smsKey}
                  onValueChange={(v) => setSmsKey(v ?? '')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('polls.form.choosePattern')} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.key} value={tpl.key}>
                        {tpl.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('polls.form.offerPattern')}</Label>
                <Select
                  items={templates.map((tpl) => ({ value: tpl.key, label: tpl.title }))}
                  value={offerKey}
                  onValueChange={(v) => setOfferKey(v ?? '')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('polls.form.choosePattern')} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.key} value={tpl.key}>
                        {tpl.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('polls.form.linkMode')}</Label>
              <Select
                items={[
                  { value: 'url', label: t('polls.linkMode.url') },
                  { value: 'token', label: t('polls.linkMode.token') },
                ]}
                value={linkMode}
                onValueChange={(v) => setLinkMode((v as LinkMode) || 'url')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">{t('polls.linkMode.url')}</SelectItem>
                  <SelectItem value="token">{t('polls.linkMode.token')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('polls.form.linkModeHint')}</p>
            </div>
          </div>
        </div>

        <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || isLoading}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                description: description.trim(),
                sms_template_key: smsKey,
                offer_sms_template_key: offerKey,
                link_mode: linkMode,
                filters: filters(),
                questions: isDraft
                  ? questions.map((q) => ({
                      text: q.text.trim(),
                      kind: q.kind,
                      options: (q.options ?? []).map((o) => o.trim()).filter(Boolean),
                      required: q.required,
                    }))
                  : [],
              })
            }
          >
            {isLoading ? t('common.saving') : poll ? t('common.update') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
