import { useState } from 'react'
import type { Session } from '@/db/schema'
import { ScenarioPanel } from './ScenarioPanel'
import { AskKoreanModal } from './AskKoreanModal'
import { WordLookupModal } from './WordLookupModal'

interface Props {
  session: Session & { id: number }
  onEnd: () => void
}

interface Stage {
  num: string
  title: string
  duration: string
  detail: (userRole: string, aiRole: string) => string
}

const CLUB_STAGES: Stage[] = [
  {
    num: '①',
    title: '표현 연습',
    duration: '3-4분',
    detail: () => '시나리오의 keyExpressions를 함께 보며 핵심 표현 익히기',
  },
  {
    num: '②',
    title: '상황극 진행',
    duration: '3-4분',
    detail: (userRole, aiRole) =>
      `한 명이 [${userRole}], 다른 명이 [${aiRole}]로 직접 회화`,
  },
  {
    num: '③',
    title: '역할 바꿔서',
    duration: '3-4분',
    detail: () => '같은 시나리오를 반대 입장에서 다시',
  },
  {
    num: '④',
    title: '추가 상황 (선택)',
    duration: '3-4분',
    detail: () => 'plot twist 추가 (예: 카드 안 됨, 갑작스런 변경) 후 ②③ 반복',
  },
  {
    num: '⑤',
    title: '마무리',
    duration: '5분',
    detail: () => '잘 쓴 표현 정리 — "한국어로?" + "단어 뜻" 버튼으로 박제',
  },
]

export function PairSessionView({ session, onEnd }: Props) {
  const [askKoreanOpen, setAskKoreanOpen] = useState(false)
  const [wordLookupOpen, setWordLookupOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set())

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function toggleStage(idx: number) {
    setCompletedStages((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const isHost = session.role === 'host'
  const userRole = session.scenarioUserRole ?? '역할 A'
  const aiRole = session.scenarioAiRole ?? '역할 B'

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display italic text-3xl text-accent">
            <span className="sig-star">진행 중</span>
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            페어 회화 ·{' '}
            <span className="text-accent font-medium">
              {isHost ? '호스트' : '게스트'}
            </span>
            {session.participants && session.participants.length > 0 && (
              <span> · 참여자 {session.participants.length + 1}명</span>
            )}
          </p>
        </div>
      </header>

      <ScenarioPanel session={session} />

      {/* 동아리 페어 진행 가이드 */}
      <details
        open
        className="border border-line bg-white rounded-2xl shadow-sm group"
      >
        <summary className="cursor-pointer list-none p-4 flex items-center justify-between hover:bg-bg-soft rounded-2xl transition-colors">
          <div className="flex items-baseline gap-2">
            <span className="text-base">📋</span>
            <span className="font-display italic text-lg text-ink">
              동아리 페어 진행 (30분)
            </span>
            <span className="text-xs text-ink-soft">
              · {completedStages.size}/{CLUB_STAGES.length}
            </span>
          </div>
          <span className="text-xs text-ink-soft group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>
        <div className="px-4 pb-4 space-y-2">
          {CLUB_STAGES.map((stage, i) => {
            const completed = completedStages.has(i)
            return (
              <button
                key={i}
                onClick={() => toggleStage(i)}
                className={`w-full text-left flex gap-3 p-3 rounded-xl border transition-all ${
                  completed
                    ? 'bg-accent-soft border-accent'
                    : 'bg-bg-soft border-line hover:border-accent'
                }`}
              >
                <span
                  className={`font-display italic text-xl shrink-0 ${
                    completed ? 'text-accent' : 'text-ink-soft'
                  }`}
                >
                  {completed ? '✓' : stage.num}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className={`font-medium text-sm ${
                        completed
                          ? 'text-accent line-through opacity-70'
                          : 'text-ink'
                      }`}
                    >
                      {stage.title}
                    </span>
                    <span className="text-xs text-ink-soft">{stage.duration}</span>
                  </div>
                  <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">
                    {stage.detail(userRole, aiRole)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </details>

      <section className="border border-line gradient-card-warm rounded-2xl p-5 space-y-3">
        <p className="text-sm text-ink leading-relaxed">
          ✦ 직접 음성 회화하면서 학습 모먼트를 박제하세요. 종료 후 다른 디바이스와 캡처를 동기화할 수 있어요.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setAskKoreanOpen(true)}
            className="px-3 py-1.5 border border-line text-ink-soft rounded-full text-sm hover:bg-accent-soft hover:border-accent hover:text-accent transition-colors"
          >
            한국어로?
          </button>
          <button
            onClick={() => setWordLookupOpen(true)}
            className="px-3 py-1.5 border border-line text-ink-soft rounded-full text-sm hover:bg-teal-soft hover:border-teal hover:text-teal transition-colors"
          >
            단어 뜻
          </button>
        </div>
      </section>

      <button
        onClick={onEnd}
        className="w-full px-4 py-2.5 border border-line text-ink-soft rounded-2xl hover:bg-bg-soft hover:border-accent transition-colors"
      >
        회화 종료
      </button>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-ink text-bg rounded-full text-sm shadow-lg z-30 animate-pop-in">
          {toast}
        </div>
      )}

      <AskKoreanModal
        open={askKoreanOpen}
        onClose={() => setAskKoreanOpen(false)}
        sessionId={session.id}
        scenarioContext={session.scenarioBrief}
        onUseInChat={() => {
          showToast('🔖 표현 저장됨')
          setAskKoreanOpen(false)
        }}
      />
      <WordLookupModal
        open={wordLookupOpen}
        onClose={() => setWordLookupOpen(false)}
        sessionId={session.id}
        lastAssistantContent={undefined}
        onCapture={(alreadyKnew) => {
          showToast(alreadyKnew ? '🔖 이미 저장된 단어' : '🔖 단어 저장됨')
        }}
      />
    </div>
  )
}
