import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Users,
  Send,
  Gift,
  Lock,
  Pencil,
  RefreshCw,
  Copy,
  MessageSquareQuote,
} from 'lucide-react'
import { toast } from 'sonner'
import { FormattedDate } from '@/components/common/FormattedDate'
import { pollService } from '../api/polls'
import {
  POLL_STATUS_COLORS,
  SMS_STATUS_COLORS,
  SMS_STATUSES,
  PollRecipient,
  SendResult,
} from '../types'
import { PollFormDialog } from '../components/PollFormDialog'
import { PollOfferDialog } from '../components/PollOfferDialog'

/**
 * One poll end to end: who it targets, how delivery went, what came back, and
 * who is worth an offer. The three actions run in order - build the audience,
 * send, then follow up - so each button only lights up at its own stage.
 */
export function PollDetailPage() {
  const { id } = useParams<{ id: string }>()
  const pollId = Number(id)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isOfferOpen, setIsOfferOpen] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [smsFilter, setSmsFilter] = useState('all')
  const [respondedOnly, setRespondedOnly] = useState(false)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['poll', pollId] })
    queryClient.invalidateQueries({ queryKey: ['poll-results', pollId] })
    queryClient.invalidateQueries({ queryKey: ['poll-recipients', pollId] })
    queryClient.invalidateQueries({ queryKey: ['polls'] })
  }

  const onError = (error: any) => toast.error(error.response?.data?.message || t('common.error'))

  const { data: poll, isLoading } = useQuery({
    queryKey: ['poll', pollId],
    queryFn: () => pollService.getById(pollId),
    enabled: Number.isFinite(pollId),
  })

  const { data: results } = useQuery({
    queryKey: ['poll-results', pollId],
    queryFn: () => pollService.results(pollId),
    enabled: Number.isFinite(pollId),
  })

  const { data: recipientData, isFetching: recipientsLoading } = useQuery({
    queryKey: ['poll-recipients', pollId, smsFilter, respondedOnly],
    queryFn: () =>
      pollService.recipients(pollId, {
        limit: 100,
        smsStatus: smsFilter,
        respondedOnly,
        withAnswers: true,
      }),
    enabled: Number.isFinite(pollId),
  })

  const reportSend = (result: SendResult) => {
    if (result.failed > 0) {
      toast.warning(t('polls.sendPartial', { sent: result.sent, failed: result.failed }))
    } else {
      toast.success(t('polls.sendSuccess', { count: result.sent }))
    }
    if (result.remaining > 0) toast.info(t('polls.sendRemaining', { count: result.remaining }))
    result.errors.slice(0, 3).forEach((e) => toast.error(e))
  }

  const audienceMutation = useMutation({
    mutationFn: () => pollService.buildAudience(pollId),
    onSuccess: (preview) => {
      invalidate()
      toast.success(t('polls.audienceBuilt', { total: preview.total, reachable: preview.reachable }))
    },
    onError,
  })

  const sendMutation = useMutation({
    mutationFn: (ids: number[]) => pollService.send(pollId, ids),
    onSuccess: (result) => {
      invalidate()
      reportSend(result)
      setSelected([])
    },
    onError,
  })

  const closeMutation = useMutation({
    mutationFn: () => pollService.close(pollId),
    onSuccess: () => {
      invalidate()
      toast.success(t('polls.closeSuccess'))
    },
    onError,
  })

  const updateMutation = useMutation({
    mutationFn: (values: any) => pollService.update(pollId, values),
    onSuccess: () => {
      invalidate()
      toast.success(t('polls.updateSuccess'))
      setIsEditOpen(false)
    },
    onError,
  })

  const offerMutation = useMutation({
    mutationFn: (message: string) => pollService.sendOffers(pollId, selected, message),
    onSuccess: (result) => {
      invalidate()
      reportSend(result)
      setIsOfferOpen(false)
      setSelected([])
    },
    onError,
  })

  if (isLoading || !poll) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const stats = results?.stats ?? poll.stats
  const recipients = recipientData?.recipients ?? []
  const selectedRecipients = recipients.filter((r) => selected.includes(r.id))
  const responseRate = stats.sent > 0 ? Math.round((stats.responded / stats.sent) * 100) : 0

  const hasAudience = stats.recipients > 0
  const canBuildAudience = poll.status === 'Draft'
  const isClosed = poll.status === 'Closed'
  const canSend = hasAudience && stats.pending > 0 && !isClosed
  // Only recipients still waiting for the invitation can be picked for it.
  const selectedPending = selectedRecipients.filter((r) => r.sms_status === 'Pending')
  const canClose = poll.status !== 'Closed' && poll.status !== 'Draft'

  const toggle = (rid: number) =>
    setSelected((prev) => (prev.includes(rid) ? prev.filter((x) => x !== rid) : [...prev, rid]))

  const copyLink = (r: PollRecipient) => {
    const url = `${window.location.origin}/p/${r.token}`
    navigator.clipboard?.writeText(url)
    toast.success(t('polls.linkCopied'))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="gap-1 -ms-2" onClick={() => navigate('/polls')}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t('polls.backToList')}
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{poll.title}</h1>
            <Badge variant="outline" className={POLL_STATUS_COLORS[poll.status] || ''}>
              {t(`polls.status.${poll.status}`)}
            </Badge>
          </div>
          {poll.description && <p className="text-sm text-muted-foreground">{poll.description}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          {poll.status === 'Draft' && (
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Pencil className="me-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          )}
          {canBuildAudience && (
            <Button
              variant="outline"
              onClick={() => audienceMutation.mutate()}
              disabled={audienceMutation.isPending}
            >
              <Users className="me-2 h-4 w-4" />
              {hasAudience ? t('polls.rebuildAudience') : t('polls.buildAudience')}
            </Button>
          )}
          {canSend && (
            <>
              <Button
                variant="outline"
                onClick={() => sendMutation.mutate(selectedPending.map((r) => r.id))}
                disabled={sendMutation.isPending || selectedPending.length === 0}
              >
                <Send className="me-2 h-4 w-4" />
                {t('polls.sendSelected', { count: selectedPending.length })}
              </Button>
              <Button onClick={() => sendMutation.mutate([])} disabled={sendMutation.isPending}>
                <Send className="me-2 h-4 w-4" />
                {sendMutation.isPending
                  ? t('common.sending')
                  : t('polls.sendTo', { count: stats.pending })}
              </Button>
            </>
          )}
          {canClose && (
            <Button
              variant="outline"
              onClick={() => closeMutation.mutate()}
              disabled={closeMutation.isPending}
            >
              <Lock className="me-2 h-4 w-4" />
              {t('polls.close')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('polls.stats.recipients')} value={stats.recipients} />
        <StatCard label={t('polls.stats.sent')} value={stats.sent} hint={
          stats.failed > 0 ? t('polls.stats.failedHint', { count: stats.failed }) : undefined
        } />
        <StatCard
          label={t('polls.stats.responded')}
          value={stats.responded}
          hint={stats.sent > 0 ? t('polls.table.responseRate', { rate: responseRate }) : undefined}
        />
        <StatCard label={t('polls.stats.offersSent')} value={stats.offers_sent} />
      </div>

      {isClosed && (
        <Card className="border-slate-300 bg-slate-100">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-slate-800">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              {t('polls.ended')}
              {poll.closed_at && (
                <>
                  {' '}
                  <FormattedDate date={poll.closed_at} format="YYYY/MM/DD" />
                </>
              )}
            </span>
          </CardContent>
        </Card>
      )}

      {!hasAudience && !isClosed && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4 text-sm text-blue-900">
            {t('polls.noAudienceYet')}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && results.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('polls.results')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {results.questions.map((q) => (
              <div key={q.question_id} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{q.text}</p>
                  <span className="text-xs text-muted-foreground">
                    {t('polls.responseCount', { count: q.responses })}
                    {q.average !== undefined && q.average !== null && (
                      <> · {t('polls.average', { value: q.average.toFixed(1) })}</>
                    )}
                  </span>
                </div>
                {q.breakdown && q.breakdown.length > 0 && (
                  <div className="space-y-1">
                    {q.breakdown.map((b) => {
                      const pct = q.responses > 0 ? (b.count / q.responses) * 100 : 0
                      return (
                        <div key={b.label} className="flex items-center gap-3 text-sm">
                          <span className="w-24 shrink-0 truncate">{b.label}</span>
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="w-10 shrink-0 text-end text-muted-foreground">
                            {b.count}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
                {q.text_answers && q.text_answers.length > 0 && (
                  <ul className="space-y-1 rounded-md border bg-gray-50 p-3 text-sm max-h-48 overflow-y-auto">
                    {q.text_answers.map((a, i) => (
                      <li key={i} className="border-b last:border-0 pb-1 last:pb-0">
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
                {q.responses === 0 && (
                  <p className="text-sm text-muted-foreground">{t('polls.noAnswersYet')}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recipients */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg">{t('polls.recipients')}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={respondedOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRespondedOnly((v) => !v)}
              >
                <MessageSquareQuote className="me-2 h-4 w-4" />
                {t('polls.respondedOnly')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ['poll-recipients', pollId] })
                }
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                disabled={selected.length === 0}
                onClick={() => setIsOfferOpen(true)}
              >
                <Gift className="me-2 h-4 w-4" />
                {t('polls.offers.sendTo', { count: selected.length })}
              </Button>
            </div>
          </div>
          <Tabs value={smsFilter} onValueChange={(v: string) => setSmsFilter(v || 'all')}>
            <TabsList>
              <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
              {SMS_STATUSES.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {t(`polls.smsStatus.${s}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {recipientsLoading ? t('common.loading') : t('polls.noRecipients')}
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selected.length === recipients.length && recipients.length > 0}
                        onChange={(e) =>
                          setSelected(e.target.checked ? recipients.map((r) => r.id) : [])
                        }
                      />
                    </TableHead>
                    <TableHead>{t('polls.table.customer')}</TableHead>
                    <TableHead>{t('polls.table.guarantee')}</TableHead>
                    <TableHead>{t('polls.table.delivery')}</TableHead>
                    <TableHead>{t('polls.table.answer')}</TableHead>
                    <TableHead className="text-end">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={selected.includes(r.id)}
                          onChange={() => toggle(r.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.customer_name || t('common.unknown')}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {r.customer_phone || '—'}
                        </div>
                        {r.customer_city && (
                          <div className="text-xs text-muted-foreground">{r.customer_city}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm" dir="ltr">
                          {r.guarantee_code || '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">{r.product_name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SMS_STATUS_COLORS[r.sms_status] || ''}>
                          {t(`polls.smsStatus.${r.sms_status}`)}
                        </Badge>
                        {r.sent_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <FormattedDate date={r.sent_at} format="YYYY/MM/DD" />
                          </div>
                        )}
                        {r.sms_error && (
                          <div className="text-xs text-red-600 mt-1">{r.sms_error}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.responded_at ? (
                          <div className="space-y-1">
                            <div className="text-xs text-emerald-700">
                              <FormattedDate date={r.responded_at} format="YYYY/MM/DD" />
                            </div>
                            {r.answers?.map((a) => (
                              <div key={a.question_id} className="text-xs">
                                <span className="text-muted-foreground">{a.question_text}: </span>
                                {a.answer_text || a.answer_number}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t('polls.noResponse')}
                          </span>
                        )}
                        {r.offer_sent_at && (
                          <div className="text-xs text-purple-700 mt-1">
                            {t('polls.offerSent')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        {isClosed ? (
                          <span className="text-xs text-muted-foreground">{t('polls.linkEnded')}</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => copyLink(r)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Link to={`/p/${r.token}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm">
                                {t('polls.openLink')}
                              </Button>
                            </Link>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PollFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        poll={poll}
        onSubmit={async (values) => {
          await updateMutation.mutateAsync(values).catch(() => undefined)
        }}
        isLoading={updateMutation.isPending}
      />

      <PollOfferDialog
        open={isOfferOpen}
        onOpenChange={setIsOfferOpen}
        recipients={selectedRecipients}
        onSubmit={(message) => offerMutation.mutate(message)}
        isLoading={offerMutation.isPending}
      />
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  )
}
