import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Star, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { publicPollService } from '../api/polls'
import { PollQuestion } from '../types'

type AnswerMap = Record<number, { text?: string; number?: number }>

/**
 * The page a customer lands on from their SMS. The token in the URL identifies
 * them, so their details are shown filled in and never asked for.
 */
export function PublicPollPage() {
  const { token = '' } = useParams<{ token: string }>()
  const { t } = useTranslation()

  const [answers, setAnswers] = useState<AnswerMap>({})
  const [done, setDone] = useState(false)

  const { data: poll, isLoading, isError } = useQuery({
    queryKey: ['public-poll', token],
    queryFn: () => publicPollService.get(token),
    enabled: !!token,
    retry: false,
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      publicPollService.submit(
        token,
        Object.entries(answers).map(([qid, a]) => ({
          question_id: Number(qid),
          text: a.text,
          number: a.number,
        }))
      ),
    onSuccess: () => setDone(true),
    onError: (error: any) =>
      toast.error(error.response?.data?.message || t('publicPoll.submitFailed')),
  })

  const setAnswer = (qid: number, value: { text?: string; number?: number }) =>
    setAnswers((prev) => ({ ...prev, [qid]: value }))

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </Shell>
    )
  }

  if (isError || !poll) {
    return (
      <Shell>
        <Message icon={<AlertCircle className="h-10 w-10 text-red-500" />} title={t('publicPoll.invalidTitle')}>
          {t('publicPoll.invalidDesc')}
        </Message>
      </Shell>
    )
  }

  if (done || poll.already_answered) {
    return (
      <Shell>
        <Message
          icon={<CheckCircle2 className="h-10 w-10 text-emerald-500" />}
          title={t('publicPoll.thanksTitle')}
        >
          {t('publicPoll.thanksDesc')}
        </Message>
      </Shell>
    )
  }

  if (poll.closed) {
    return (
      <Shell>
        <Message icon={<AlertCircle className="h-10 w-10 text-amber-500" />} title={t('publicPoll.closedTitle')}>
          {t('publicPoll.closedDesc')}
        </Message>
      </Shell>
    )
  }

  const missingRequired = poll.questions.some((q) => {
    if (!q.required) return false
    const a = answers[q.id]
    return !a || (!a.text && a.number === undefined)
  })

  return (
    <Shell>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{poll.title}</CardTitle>
          {poll.description && (
            <p className="text-sm text-muted-foreground">{poll.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prefilled from the token - shown, not asked. */}
          <div className="rounded-md border bg-gray-50 p-4 text-sm space-y-1">
            <p className="font-medium">
              {t('publicPoll.greeting', { name: poll.customer_name || '' })}
            </p>
            {poll.product_name && (
              <p className="text-muted-foreground">
                {t('publicPoll.product')}: {poll.product_name}
              </p>
            )}
            {poll.guarantee_code && (
              <p className="text-muted-foreground">
                {t('publicPoll.guarantee')}: <span dir="ltr">{poll.guarantee_code}</span>
              </p>
            )}
          </div>

          {poll.questions.map((q, index) => (
            <QuestionField
              key={q.id}
              index={index + 1}
              question={q}
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
            />
          ))}

          <Button
            className="w-full"
            size="lg"
            disabled={missingRequired || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? t('common.sending') : t('publicPoll.submit')}
          </Button>
          {missingRequired && (
            <p className="text-center text-xs text-muted-foreground">
              {t('publicPoll.requiredHint')}
            </p>
          )}
        </CardContent>
      </Card>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto w-full max-w-xl">{children}</div>
    </div>
  )
}

function Message({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        {icon}
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  )
}

function QuestionField({
  index,
  question,
  value,
  onChange,
}: {
  index: number
  question: PollQuestion
  value?: { text?: string; number?: number }
  onChange: (v: { text?: string; number?: number }) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <Label className="text-base">
        {index}. {question.text}
        {question.required && <span className="text-red-500 ms-1">*</span>}
      </Label>

      {question.kind === 'rating' && (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ number: n })}
              className="p-1"
              aria-label={String(n)}
            >
              <Star
                className={`h-8 w-8 ${
                  (value?.number ?? 0) >= n
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {question.kind === 'yes_no' && (
        <div className="flex gap-2">
          {['yes', 'no'].map((opt) => (
            <Button
              key={opt}
              type="button"
              variant={value?.text === opt ? 'default' : 'outline'}
              onClick={() => onChange({ text: opt })}
            >
              {t(`publicPoll.${opt}`)}
            </Button>
          ))}
        </div>
      )}

      {question.kind === 'choice' && (
        <div className="space-y-2">
          {question.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange({ text: opt })}
              className={`w-full rounded-md border px-4 py-2 text-start text-sm transition ${
                value?.text === opt
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'hover:bg-gray-50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.kind === 'text' && (
        <Textarea
          rows={3}
          maxLength={1000}
          value={value?.text ?? ''}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder={t('publicPoll.textPlaceholder')}
        />
      )}
    </div>
  )
}
