import { useState } from 'react'
import type { Session } from '@/db/schema'
import { ScenarioPanel } from './ScenarioPanel'
import { AskKoreanModal } from './AskKoreanModal'
import { WordLookupModal } from './WordLookupModal'

interface Props {
  session: Session & { id: number }
  onEnd: () => void
}

export function PairSessionView({ session, onEnd }: Props) {
  const [askKoreanOpen, setAskKoreanOpen] = useState(false)
  const [wordLookupOpen, setWordLookupOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const isHost = session.role === 'host'

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
