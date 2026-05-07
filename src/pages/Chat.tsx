import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, type Session } from '@/db/schema'
import {
  getActiveSessionId,
  startSession,
  endSession,
  clearActiveSessionId,
} from '@/lib/conversation'
import { generateScenario, type Scenario } from '@/lib/scenario'
import {
  extractFromConversation,
  savePickedExpressions,
  type ExtractedExpression,
} from '@/lib/extractor'
import { ScenarioSetup, type SetupOpts } from '@/components/ScenarioSetup'
import { ScenarioPreview } from '@/components/ScenarioPreview'
import { ChatView } from '@/components/ChatView'
import { PairSessionView } from '@/components/PairSessionView'
import { SessionEndDialog } from '@/components/SessionEndDialog'
import { ExtractionResults } from '@/components/ExtractionResults'

type State =
  | { kind: 'loading' }
  | { kind: 'setup' }
  | { kind: 'generating'; opts: SetupOpts }
  | { kind: 'preview'; scenario: Scenario; opts: SetupOpts }
  | { kind: 'starting'; scenario: Scenario; opts: SetupOpts }
  | { kind: 'live'; session: Session & { id: number } }
  | {
      kind: 'extracting'
      session: Session & { id: number }
      rating?: number
      note?: string
    }
  | {
      kind: 'extracted'
      session: Session & { id: number }
      rating?: number
      note?: string
      expressions: ExtractedExpression[]
      error: string | null
    }
  | { kind: 'finalizing' }
  | { kind: 'error'; message: string; retry: () => void }

export function Chat() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [savingEnd, setSavingEnd] = useState(false)

  useEffect(() => {
    const activeId = getActiveSessionId()
    if (!activeId) {
      setState({ kind: 'setup' })
      return
    }
    db.sessions.get(activeId).then((s) => {
      if (!s || s.endedAt !== null || s.id === undefined) {
        clearActiveSessionId()
        setState({ kind: 'setup' })
      } else {
        setState({ kind: 'live', session: s as Session & { id: number } })
      }
    })
  }, [])

  async function handleGenerate(opts: SetupOpts) {
    setState({ kind: 'generating', opts })
    try {
      const scenario = await generateScenario({
        difficulty: opts.difficulty,
        tags: opts.tags,
        hint: opts.hint,
      })
      setState({ kind: 'preview', scenario, opts })
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : '시나리오 생성 실패',
        retry: () => handleGenerate(opts),
      })
    }
  }

  async function handleStart(scenario: Scenario, opts: SetupOpts) {
    setState({ kind: 'starting', scenario, opts })
    try {
      const sessionId = await startSession({
        scenario,
        difficulty: opts.difficulty,
        tags: opts.tags,
        mode: opts.mode,
        partnerName: opts.partnerName,
      })
      const s = await db.sessions.get(sessionId)
      if (!s || s.id === undefined) {
        throw new Error('세션 시작 후 조회 실패')
      }
      setState({ kind: 'live', session: s as Session & { id: number } })
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : '세션 시작 실패',
        retry: () => handleStart(scenario, opts),
      })
    }
  }

  async function handleEndDialogSubmit(
    rating: number | undefined,
    note: string | undefined,
  ) {
    if (state.kind !== 'live') return
    setSavingEnd(true)

    const session = state.session

    // 다이얼로그 닫고 추출 페이지로 전환
    setEndDialogOpen(false)
    setSavingEnd(false)
    setState({ kind: 'extracting', session, rating, note })

    // 추출 시작 (백그라운드에서 await)
    try {
      const turns = await db.turns
        .where('sessionId')
        .equals(session.id)
        .sortBy('createdAt')
      const expressions = await extractFromConversation({
        difficulty: session.difficulty,
        turns: turns.map((t) => ({ role: t.role, content: t.content })),
      })
      setState({
        kind: 'extracted',
        session,
        rating,
        note,
        expressions,
        error: null,
      })
    } catch (e) {
      console.warn('[chat] 추출 실패:', e)
      setState({
        kind: 'extracted',
        session,
        rating,
        note,
        expressions: [],
        error: e instanceof Error ? e.message : '추출 실패',
      })
    }
  }

  async function handleExtractionSubmit(kept: ExtractedExpression[]) {
    if (state.kind !== 'extracted') return
    setState({ kind: 'finalizing' })
    try {
      if (kept.length > 0) {
        await savePickedExpressions({
          sessionId: state.session.id,
          expressions: kept,
        })
      }
      await endSession({
        sessionId: state.session.id,
        rating: state.rating,
        note: state.note,
      })
      navigate('/sessions')
    } catch (e) {
      console.warn('[chat] 종료 저장 실패:', e)
      // 에러 나도 일단 정상 진입
      navigate('/sessions')
    }
  }

  async function handleExtractionSkip() {
    if (state.kind !== 'extracted') return
    setState({ kind: 'finalizing' })
    try {
      await endSession({
        sessionId: state.session.id,
        rating: state.rating,
        note: state.note,
      })
      navigate('/sessions')
    } catch (e) {
      console.warn('[chat] 종료 저장 실패:', e)
      navigate('/sessions')
    }
  }

  switch (state.kind) {
    case 'loading':
      return <p className="text-ink-soft text-sm">불러오는 중...</p>

    case 'setup':
      return <ScenarioSetup onGenerate={handleGenerate} loading={false} />

    case 'generating':
      return <ScenarioSetup onGenerate={handleGenerate} loading={true} />

    case 'preview':
      return (
        <ScenarioPreview
          scenario={state.scenario}
          mode={state.opts.mode}
          partnerName={state.opts.partnerName}
          onStart={() => handleStart(state.scenario, state.opts)}
          onRegenerate={() => handleGenerate(state.opts)}
          onCancel={() => setState({ kind: 'setup' })}
          starting={false}
        />
      )

    case 'starting':
      return (
        <ScenarioPreview
          scenario={state.scenario}
          mode={state.opts.mode}
          partnerName={state.opts.partnerName}
          onStart={() => {}}
          onRegenerate={() => {}}
          onCancel={() => {}}
          starting={true}
        />
      )

    case 'live': {
      const view =
        state.session.mode === 'solo' ? (
          <ChatView
            session={state.session}
            onEnd={() => setEndDialogOpen(true)}
          />
        ) : (
          <PairSessionView
            session={state.session}
            onEnd={() => setEndDialogOpen(true)}
          />
        )
      return (
        <>
          {view}
          <SessionEndDialog
            open={endDialogOpen}
            onCancel={() => setEndDialogOpen(false)}
            onSubmit={handleEndDialogSubmit}
            saving={savingEnd}
          />
        </>
      )
    }

    case 'extracting':
      return (
        <ExtractionResults
          expressions={[]}
          loading={true}
          saving={false}
          error={null}
          onSubmit={() => {}}
          onSkip={() => {}}
        />
      )

    case 'extracted':
      return (
        <ExtractionResults
          expressions={state.expressions}
          loading={false}
          saving={false}
          error={state.error}
          onSubmit={handleExtractionSubmit}
          onSkip={handleExtractionSkip}
        />
      )

    case 'finalizing':
      return <p className="text-ink-soft text-sm animate-pulse">저장 중...</p>

    case 'error':
      return (
        <div className="space-y-4">
          <h1 className="font-display italic text-4xl text-ink">앗,</h1>
          <p className="text-ink">문제가 발생했어요.</p>
          <p className="text-sm text-ink-soft whitespace-pre-wrap break-words">
            {state.message}
          </p>
          <div className="flex gap-2">
            <button
              onClick={state.retry}
              className="px-4 py-2 bg-accent text-bg rounded-2xl text-sm"
            >
              다시 시도
            </button>
            <button
              onClick={() => setState({ kind: 'setup' })}
              className="px-4 py-2 border border-line text-ink-soft rounded-2xl text-sm"
            >
              처음으로
            </button>
          </div>
        </div>
      )
  }
}
