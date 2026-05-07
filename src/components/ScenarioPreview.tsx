import type { Scenario } from '@/lib/scenario'
import type { SessionMode, DialogTurn } from '@/db/schema'
import { getNickname } from '@/lib/profile'

interface Props {
  scenario: Scenario
  mode: SessionMode
  partnerName?: string
  onStart: () => void
  onRegenerate: () => void
  onCancel: () => void
  starting: boolean
}

export function ScenarioPreview({
  scenario,
  mode,
  partnerName,
  onStart,
  onRegenerate,
  onCancel,
  starting,
}: Props) {
  const nickname = getNickname()
  const userLabel = mode === 'solo' ? nickname || '나' : scenario.userRole
  const partnerLabel =
    mode === 'pair' && partnerName
      ? `${partnerName} (${scenario.aiRole})`
      : scenario.aiRole

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl text-accent">
          <span className="sig-star">시나리오</span>
        </h1>
        <p className="text-ink-soft text-sm mt-1">
          마음에 들면 시작, 다른 시나리오를 받고 싶으면 다시 생성하세요.
        </p>
      </header>

      <section className="border border-line bg-white rounded-2xl p-5 shadow-sm space-y-5">
        <div>
          <h2 className="font-display italic text-2xl text-accent">
            {scenario.title}
          </h2>
        </div>

        <p className="text-ink leading-relaxed whitespace-pre-line">
          {scenario.brief}
        </p>

        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <p className="text-xs uppercase text-ink-soft tracking-wider mb-1">
              너의 역할
            </p>
            <p className="text-sm text-ink">{scenario.userRole}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-ink-soft tracking-wider mb-1">
              {mode === 'solo' ? 'AI 역할' : '상대 역할'}
            </p>
            <p className="text-sm text-ink">{scenario.aiRole}</p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase text-ink-soft tracking-wider mb-2">
            회화 진행 흐름
          </p>
          <ol className="space-y-1.5 list-none">
            {scenario.objectives.map((o, i) => (
              <li
                key={i}
                className="text-sm text-ink flex gap-2.5 leading-relaxed"
              >
                <span className="font-display italic text-accent shrink-0">
                  {i + 1}.
                </span>
                <span>{o}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <p className="text-xs uppercase text-ink-soft tracking-wider mb-2">
            예시 대화 흐름
          </p>
          <div className="bg-bg-soft border border-line rounded-xl p-4 space-y-3">
            {scenario.keyExpressions.map((turn, i) => (
              <DialogRow
                key={i}
                turn={turn}
                userLabel={userLabel}
                partnerLabel={partnerLabel}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase text-ink-soft tracking-wider mb-2">
            만나게 될 표현·단어
          </p>
          <ul className="space-y-1.5">
            {scenario.learningGoals.map((g, i) => (
              <li key={i} className="text-sm text-ink">
                <span className="highlight">{g}</span>
              </li>
            ))}
          </ul>
        </div>

        {mode === 'solo' && (
          <div className="pt-3 border-t border-line">
            <p className="text-xs uppercase text-ink-soft tracking-wider mb-2">
              AI의 첫 마디
            </p>
            <p className="font-display italic text-ink leading-relaxed">
              "{scenario.openingLine}"
            </p>
          </div>
        )}
      </section>

      <div className="flex gap-2">
        <button
          onClick={onStart}
          disabled={starting}
          className="flex-1 px-4 py-3 bg-accent text-bg rounded-2xl font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shadow-sm"
        >
          {starting ? '시작 중...' : '시작 ✦'}
        </button>
        <button
          onClick={onRegenerate}
          disabled={starting}
          className="px-4 py-3 border border-line text-ink-soft rounded-2xl hover:bg-bg-soft hover:border-accent transition-colors disabled:opacity-40 text-sm"
        >
          다시 생성
        </button>
        <button
          onClick={onCancel}
          disabled={starting}
          className="px-4 py-3 border border-line text-ink-soft rounded-2xl hover:bg-bg-soft transition-colors disabled:opacity-40 text-sm"
        >
          취소
        </button>
      </div>
    </div>
  )
}

function DialogRow({
  turn,
  userLabel,
  partnerLabel,
}: {
  turn: DialogTurn
  userLabel: string
  partnerLabel: string
}) {
  const isUser = turn.speaker === 'user'
  const label = isUser ? userLabel : partnerLabel
  return (
    <div
      className={`pl-3 border-l-2 ${
        isUser ? 'border-accent' : 'border-line'
      }`}
    >
      <p
        className={`text-xs font-medium mb-0.5 ${
          isUser ? 'text-accent' : 'text-ink-soft'
        }`}
      >
        {label}
      </p>
      <p className="text-sm font-display italic text-ink leading-relaxed">
        "{turn.english}"
      </p>
      {turn.intentKo && (
        <p className="text-xs text-ink-soft mt-0.5">→ {turn.intentKo}</p>
      )}
    </div>
  )
}
