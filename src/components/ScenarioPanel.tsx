import { useState } from 'react'
import type { Session, DialogTurn } from '@/db/schema'
import { getNickname } from '@/lib/profile'

interface Props {
  session: Session
}

export function ScenarioPanel({ session }: Props) {
  const [open, setOpen] = useState(true)

  const nickname = getNickname()
  const userLabel =
    session.mode === 'solo'
      ? nickname || '나'
      : session.scenarioUserRole || '나'
  const partnerLabel =
    session.mode === 'pair' && session.partnerName
      ? `${session.partnerName} (${session.scenarioAiRole ?? ''})`.trim()
      : session.scenarioAiRole || '상대'

  return (
    <div className="border border-line bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-bg-soft transition-colors text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-display italic text-accent text-base shrink-0">✦</span>
          <span className="text-sm font-medium text-ink shrink-0">시나리오 가이드</span>
          {!open && (
            <span className="text-xs text-ink-soft truncate">
              · {session.scenarioTitle}
            </span>
          )}
        </span>
        <span className="text-ink-soft text-xs shrink-0 ml-2">
          {open ? '접기 ▲' : '펼치기 ▼'}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 max-h-[42vh] overflow-y-auto border-t border-line pt-3">
          <div>
            <p className="text-xs uppercase text-ink-soft tracking-wider mb-1">
              상황
            </p>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
              {session.scenarioBrief}
            </p>
          </div>

          {session.scenarioObjectives && session.scenarioObjectives.length > 0 && (
            <div>
              <p className="text-xs uppercase text-ink-soft tracking-wider mb-2">
                진행 흐름
              </p>
              <ol className="space-y-1.5 list-none">
                {session.scenarioObjectives.map((o, i) => (
                  <li
                    key={i}
                    className="text-sm text-ink flex gap-2 leading-relaxed"
                  >
                    <span className="font-display italic text-accent shrink-0">
                      {i + 1}.
                    </span>
                    <span>{o}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {session.scenarioKeyExpressions &&
            session.scenarioKeyExpressions.length > 0 && (
              <div>
                <p className="text-xs uppercase text-ink-soft tracking-wider mb-2">
                  예시 대화
                </p>
                <div className="bg-bg-soft border border-line rounded-xl p-3 space-y-2.5">
                  {session.scenarioKeyExpressions.map((turn, i) => (
                    <DialogRow
                      key={i}
                      turn={turn}
                      userLabel={userLabel}
                      partnerLabel={partnerLabel}
                    />
                  ))}
                </div>
              </div>
            )}

          {session.scenarioLearningGoals &&
            session.scenarioLearningGoals.length > 0 && (
              <div>
                <p className="text-xs uppercase text-ink-soft tracking-wider mb-2">
                  만나게 될 표현·단어
                </p>
                <ul className="space-y-1">
                  {session.scenarioLearningGoals.map((g, i) => (
                    <li key={i} className="text-sm text-ink">
                      <span className="highlight">{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}
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
  return (
    <div
      className={`pl-2.5 border-l-2 ${
        isUser ? 'border-accent' : 'border-line'
      }`}
    >
      <p
        className={`text-xs font-medium mb-0.5 ${
          isUser ? 'text-accent' : 'text-ink-soft'
        }`}
      >
        {isUser ? userLabel : partnerLabel}
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
