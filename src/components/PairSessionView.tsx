import type { Session } from '@/db/schema'
import { ScenarioPanel } from './ScenarioPanel'

interface Props {
  session: Session & { id: number }
  onEnd: () => void
}

export function PairSessionView({ session, onEnd }: Props) {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display italic text-4xl text-accent">
          <span className="sig-star">진행 중</span>
        </h1>
        <p className="text-ink-soft text-sm mt-1">
          페어 회화 — 직접 음성으로 대화하세요. 시나리오 가이드를 시시각각 참고할 수 있어요.
        </p>
      </header>

      <ScenarioPanel session={session} />

      <section className="border border-line gradient-card-warm rounded-2xl p-5">
        <p className="text-sm text-ink-soft leading-relaxed">
          회화 중에 모르는 단어/표현이 나오면 아래 버튼으로 빠르게 박제할 수 있어요.
        </p>
      </section>

      <div className="flex gap-2">
        <button
          onClick={onEnd}
          className="flex-1 px-4 py-2.5 border border-line text-ink-soft rounded-2xl hover:bg-bg-soft hover:border-accent transition-colors"
        >
          회화 종료
        </button>
      </div>
    </div>
  )
}
