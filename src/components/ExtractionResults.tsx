import { useState } from 'react'
import type { ExtractedExpression } from '@/lib/extractor'

interface Props {
  expressions: ExtractedExpression[]
  loading: boolean
  saving: boolean
  error: string | null
  onSubmit: (kept: ExtractedExpression[]) => void
  onSkip: () => void
}

export function ExtractionResults({
  expressions,
  loading,
  saving,
  error,
  onSubmit,
  onSkip,
}: Props) {
  const [kept, setKept] = useState<Set<number>>(
    new Set(expressions.map((_, i) => i)),
  )

  function toggle(i: number) {
    setKept((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="font-display italic text-4xl text-accent">
            <span className="sig-star">표현 박제 중</span>
          </h1>
          <p className="text-ink-soft text-sm mt-1">
            방금 회화에서 학습 가치 있는 표현을 뽑고 있어요...
          </p>
        </header>
        <div className="border border-line bg-white rounded-2xl p-6 text-center">
          <p className="text-sm text-ink-soft animate-pulse">생각 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="font-display italic text-4xl text-ink">앗,</h1>
          <p className="text-ink mt-1">표현 추출에 실패했어요.</p>
        </header>
        <p className="text-sm text-ink-soft whitespace-pre-wrap">{error}</p>
        <button
          onClick={onSkip}
          className="px-4 py-2.5 bg-accent text-bg rounded-2xl text-sm hover:opacity-90"
        >
          건너뛰고 종료
        </button>
      </div>
    )
  }

  if (expressions.length === 0) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="font-display italic text-4xl text-ink">
            <span className="sig-star">회화 종료</span>
          </h1>
          <p className="text-ink-soft text-sm mt-1">
            이번 회화에선 박제할 표현이 없네요. 다음 회화에서 만나요.
          </p>
        </header>
        <button
          onClick={onSkip}
          disabled={saving}
          className="w-full px-4 py-2.5 bg-accent text-bg rounded-2xl font-medium hover:opacity-90 disabled:opacity-40"
        >
          {saving ? '종료 중...' : '종료'}
        </button>
      </div>
    )
  }

  const keptCount = kept.size

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display italic text-4xl text-accent">
          <span className="sig-star">표현 박제</span>
        </h1>
        <p className="text-ink-soft text-sm mt-1">
          이번 회화에서 학습 가치 있는 표현이에요. 저장할 것만 골라주세요. (탭하여 토글)
        </p>
      </header>

      <div className="space-y-2.5">
        {expressions.map((e, i) => {
          const selected = kept.has(i)
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`w-full text-left border-2 rounded-2xl p-4 transition-all lift ${
                selected
                  ? 'border-accent gradient-card'
                  : 'border-line bg-white opacity-50 hover:opacity-90'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-display italic text-ink text-base leading-relaxed flex-1">
                  "{e.english}"
                </p>
                <span
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    selected
                      ? 'bg-accent text-bg'
                      : 'border border-line text-ink-soft'
                  }`}
                >
                  {selected ? '✓' : ''}
                </span>
              </div>
              <p className="text-sm text-ink-soft mt-1.5">→ {e.intentKo}</p>
              <p className="text-xs mt-2 text-ink-soft">
                {e.type === 'good' ? '좋은 표현' : '새로 만남'}
              </p>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 sticky bottom-4">
        <button
          onClick={() => onSubmit(expressions.filter((_, i) => kept.has(i)))}
          disabled={saving}
          className="flex-1 px-4 py-3 bg-accent text-bg rounded-2xl font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shadow-md"
        >
          {saving
            ? '저장 중...'
            : keptCount > 0
              ? `${keptCount}개 저장하고 종료`
              : '하나도 저장 안 함'}
        </button>
        <button
          onClick={onSkip}
          disabled={saving}
          className="px-4 py-3 border border-line text-ink-soft rounded-2xl hover:bg-bg-soft text-sm shadow-sm"
        >
          건너뛰기
        </button>
      </div>
    </div>
  )
}
