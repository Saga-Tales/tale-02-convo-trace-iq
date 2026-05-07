import type { Session } from '@/db/schema'

interface Props {
  session: Session & { id: number }
  onEnd: () => void
}

export function PairSessionView({ session, onEnd }: Props) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl text-ink">진행 중</h1>
        <p className="text-ink-soft text-sm mt-1">
          페어 회화 — 직접 음성으로 대화하세요. 끝나면 종료를 눌러요.
        </p>
      </header>

      <section className="border border-line bg-white rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-display text-2xl text-accent">{session.scenarioTitle}</h2>
        {session.partnerName && (
          <p className="text-sm">
            <span className="text-ink-soft">파트너: </span>
            <span className="text-ink">{session.partnerName}</span>
          </p>
        )}
        <p className="text-ink leading-relaxed">{session.scenarioBrief}</p>
        <p className="text-xs text-ink-soft">
          {session.tags.join(' · ')} · {session.difficulty}
        </p>
      </section>

      <section className="border border-line bg-bg-soft rounded-xl p-5">
        <p className="text-sm text-ink-soft leading-relaxed">
          Day 3부터 — 회화 중에 모르는 단어/표현을 빠르게 캡처할 수 있게 됩니다.
          지금은 시나리오만 표시돼요.
        </p>
      </section>

      <button
        onClick={onEnd}
        className="w-full px-4 py-2.5 border border-line text-ink-soft rounded-md hover:bg-bg-soft transition-colors"
      >
        회화 종료
      </button>
    </div>
  )
}
