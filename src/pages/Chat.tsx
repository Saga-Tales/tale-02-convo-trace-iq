import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, type Session, type Turn } from '@/db/schema'
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
import {
  selectRecallPhrases,
  checkPhraseUsedInTurns,
  checkPhraseSeenInScenario,
} from '@/lib/recall'
import { reviewPhrase } from '@/lib/srs'
import { getNickname } from '@/lib/profile'
import { buildScenarioShare, type ScenarioShare } from '@/lib/share'
import { ScenarioSetup, type SetupOpts } from '@/components/ScenarioSetup'
import { ScenarioPreview } from '@/components/ScenarioPreview'
import { ChatView } from '@/components/ChatView'
import { PairSessionView } from '@/components/PairSessionView'
import { SessionEndDialog } from '@/components/SessionEndDialog'
import { ExtractionResults } from '@/components/ExtractionResults'
import { ShareScenarioModal } from '@/components/ShareScenarioModal'
import { JoinByQRModal } from '@/components/JoinByQRModal'
import { PairSyncModal } from '@/components/PairSyncModal'

type State =
  | { kind: 'loading' }
  | { kind: 'setup' }
  | { kind: 'generating'; opts: SetupOpts }
  | {
      kind: 'preview'
      scenario: Scenario
      opts: SetupOpts
      sessionUuid: string
    }
  | {
      kind: 'starting'
      scenario: Scenario
      opts: SetupOpts
      sessionUuid: string
    }
  | {
      kind: 'guest-preview'
      share: ScenarioShare
    }
  | {
      kind: 'guest-starting'
      share: ScenarioShare
    }
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
  | {
      kind: 'pair-syncing'
      session: Session & { id: number }
    }
  | { kind: 'finalizing' }
  | { kind: 'error'; message: string; retry: () => void }

export function Chat() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [savingEnd, setSavingEnd] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)

  const myName = getNickname() || '나'

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

  // ---------------------------------------------------------------------------
  // 호스트 흐름 (직접 시나리오 생성)
  // ---------------------------------------------------------------------------

  async function handleGenerate(opts: SetupOpts) {
    setState({ kind: 'generating', opts })
    try {
      const recallPhrases = await selectRecallPhrases(3)
      const recallHints = recallPhrases.map((p) => ({
        english: p.expressionEn,
        intentKo: p.intentKo,
      }))
      const scenario = await generateScenario({
        difficulty: opts.difficulty,
        tags: opts.tags,
        hint: opts.hint,
        recallPhrases: recallHints,
        mode: opts.mode,
      })
      const sessionUuid = crypto.randomUUID()
      setState({ kind: 'preview', scenario, opts, sessionUuid })
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : '시나리오 생성 실패',
        retry: () => handleGenerate(opts),
      })
    }
  }

  async function handleStart(
    scenario: Scenario,
    opts: SetupOpts,
    sessionUuid: string,
  ) {
    setState({ kind: 'starting', scenario, opts, sessionUuid })
    try {
      const sessionId = await startSession({
        scenario,
        difficulty: opts.difficulty,
        tags: opts.tags,
        mode: opts.mode,
        sessionUuid: opts.mode === 'pair' ? sessionUuid : undefined,
        role: opts.mode === 'pair' ? 'host' : undefined,
        participants: opts.mode === 'pair' ? opts.participants : undefined,
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
        retry: () => handleStart(scenario, opts, sessionUuid),
      })
    }
  }

  // ---------------------------------------------------------------------------
  // 게스트 흐름 (QR로 받음)
  // ---------------------------------------------------------------------------

  function handleScenarioReceived(share: ScenarioShare) {
    setJoinModalOpen(false)
    setState({ kind: 'guest-preview', share })
  }

  async function handleGuestStart(share: ScenarioShare) {
    setState({ kind: 'guest-starting', share })
    try {
      // 게스트의 participants는 자기 자신 외 다른 참여자들 (호스트 + 다른 게스트들)
      const otherParticipants = [
        share.hostName,
        ...share.participants.filter((p) => p !== myName),
      ]
      const sessionId = await startSession({
        scenario: share.scenario,
        difficulty: share.difficulty,
        tags: share.tags,
        mode: 'pair',
        sessionUuid: share.sessionUuid,
        role: 'guest',
        participants: otherParticipants,
      })
      const s = await db.sessions.get(sessionId)
      if (!s || s.id === undefined) {
        throw new Error('게스트 세션 시작 실패')
      }
      setState({ kind: 'live', session: s as Session & { id: number } })
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : '게스트 세션 시작 실패',
        retry: () => handleGuestStart(share),
      })
    }
  }

  // ---------------------------------------------------------------------------
  // 회화 종료 흐름 (솔로/페어 분기)
  // ---------------------------------------------------------------------------

  async function applyMasteryUpdates(
    session: Session & { id: number },
    turns: Turn[],
  ): Promise<void> {
    const userTurns = turns.filter((t) => t.role === 'user')
    if (userTurns.length === 0) return

    const allPhrases = await db.phrases.toArray()
    for (const phrase of allPhrases) {
      if (phrase.id === undefined) continue
      if (phrase.capturedAt > session.startedAt - 60 * 60 * 1000) continue

      const used = checkPhraseUsedInTurns(phrase, userTurns)
      const seen = !used && checkPhraseSeenInScenario(phrase, session)

      if (used) {
        await reviewPhrase(phrase.id, 'used')
      } else if (seen) {
        await reviewPhrase(phrase.id, 'seen')
      }
    }
  }

  async function handleEndDialogSubmit(
    rating: number | undefined,
    note: string | undefined,
  ) {
    if (state.kind !== 'live') return
    const session = state.session

    setSavingEnd(true)
    setEndDialogOpen(false)
    setSavingEnd(false)

    if (session.mode === 'pair') {
      // 페어: 추출 skip, rating/note만 저장하고 동기화 흐름으로
      await db.sessions.update(session.id, { rating, note })
      setState({ kind: 'pair-syncing', session })
      return
    }

    // 솔로: 추출 + mastery 업데이트
    setState({ kind: 'extracting', session, rating, note })

    try {
      const turns = await db.turns
        .where('sessionId')
        .equals(session.id)
        .sortBy('createdAt')

      const masteryPromise = applyMasteryUpdates(session, turns)

      const expressions = await extractFromConversation({
        difficulty: session.difficulty,
        turns: turns.map((t) => ({ role: t.role, content: t.content })),
      })

      await masteryPromise.catch((e) =>
        console.warn('[chat] mastery 업데이트 실패:', e),
      )

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

  async function handlePairSyncComplete() {
    if (state.kind !== 'pair-syncing') return
    setState({ kind: 'finalizing' })
    try {
      await endSession({ sessionId: state.session.id })
      navigate('/sessions')
    } catch (e) {
      console.warn('[chat] 페어 종료 저장 실패:', e)
      navigate('/sessions')
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // 모든 상태에서 게스트 합류 버튼은 setup일 때만 보임
  function renderJoinButton() {
    return (
      <div className="mb-4 border border-line bg-white rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink font-medium">페어 게스트로 합류</p>
          <p className="text-xs text-ink-soft mt-0.5">
            호스트의 시나리오 QR을 찍어 같은 회화에 참여
          </p>
        </div>
        <button
          onClick={() => setJoinModalOpen(true)}
          className="shrink-0 px-3 py-1.5 border border-accent text-accent rounded-full text-sm hover:bg-accent-soft transition-colors"
        >
          📱 QR로 합류
        </button>
      </div>
    )
  }

  switch (state.kind) {
    case 'loading':
      return <p className="text-ink-soft text-sm">불러오는 중...</p>

    case 'setup':
      return (
        <>
          {renderJoinButton()}
          <ScenarioSetup onGenerate={handleGenerate} loading={false} />
          <JoinByQRModal
            open={joinModalOpen}
            onClose={() => setJoinModalOpen(false)}
            onScenarioReceived={handleScenarioReceived}
          />
        </>
      )

    case 'generating':
      return (
        <>
          {renderJoinButton()}
          <ScenarioSetup onGenerate={handleGenerate} loading={true} />
        </>
      )

    case 'preview': {
      const sessionUuid = state.sessionUuid
      const opts = state.opts
      const scenario = state.scenario
      const isPairHost = opts.mode === 'pair'

      const share: ScenarioShare | null = isPairHost
        ? buildScenarioShare({
            scenario,
            difficulty: opts.difficulty,
            tags: opts.tags,
            participants: opts.participants ?? [],
            hostName: myName,
            sessionUuid,
          })
        : null

      return (
        <>
          <ScenarioPreview
            scenario={scenario}
            mode={opts.mode}
            participants={opts.participants}
            onStart={() => handleStart(scenario, opts, sessionUuid)}
            onRegenerate={() => handleGenerate(opts)}
            onCancel={() => setState({ kind: 'setup' })}
            onShareQR={isPairHost ? () => setShareModalOpen(true) : undefined}
            starting={false}
          />
          {share && (
            <ShareScenarioModal
              open={shareModalOpen}
              onClose={() => setShareModalOpen(false)}
              share={share}
            />
          )}
        </>
      )
    }

    case 'starting':
      return (
        <ScenarioPreview
          scenario={state.scenario}
          mode={state.opts.mode}
          participants={state.opts.participants}
          onStart={() => {}}
          onRegenerate={() => {}}
          onCancel={() => {}}
          starting={true}
        />
      )

    case 'guest-preview': {
      const share = state.share
      return (
        <div className="space-y-6">
          <header>
            <h1 className="font-display italic text-4xl text-accent">
              <span className="sig-star">시나리오 받음</span>
            </h1>
            <p className="text-ink-soft text-sm mt-1">
              호스트 {share.hostName}이(가) 보낸 시나리오. 시작하면 같은 회화에 참여.
            </p>
          </header>
          <ScenarioPreview
            scenario={share.scenario}
            mode="pair"
            participants={[share.hostName, ...share.participants.filter((p) => p !== myName)]}
            onStart={() => handleGuestStart(share)}
            onRegenerate={() => setState({ kind: 'setup' })}
            onCancel={() => setState({ kind: 'setup' })}
            starting={false}
          />
        </div>
      )
    }

    case 'guest-starting':
      return (
        <ScenarioPreview
          scenario={state.share.scenario}
          mode="pair"
          participants={[
            state.share.hostName,
            ...state.share.participants.filter((p) => p !== myName),
          ]}
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

    case 'pair-syncing':
      return (
        <PairSyncModal
          open={true}
          session={state.session}
          myName={myName}
          onComplete={handlePairSyncComplete}
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
