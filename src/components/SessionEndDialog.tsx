import { useState } from 'react'

interface Props {
  open: boolean
  onCancel: () => void
  onSubmit: (rating: number | undefined, note: string | undefined) => void
  saving: boolean
}

export function SessionEndDialog({ open, onCancel, onSubmit, saving }: Props) {
  const [rating, setRating] = useState<number>(0)
  const [note, setNote] = useState('')

  if (!open) return null

  function handleSubmit() {
    onSubmit(rating > 0 ? rating : undefined, note.trim() || undefined)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-bg border border-line rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4 animate-pop-in">
        <h2 className="font-display italic text-2xl text-ink">
          <span className="sig-star">회화 종료</span>
        </h2>
        <p className="text-sm text-ink-soft">
          평점과 짧은 메모를 남기면 나중에 돌아볼 때 도움이 돼요. 둘 다 선택입니다.
        </p>

        <div>
          <label className="text-sm font-medium text-ink block mb-2">평점</label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(rating === n ? 0 : n)}
                className={`w-11 h-11 rounded-2xl border-2 transition-all text-sm ${
                  n <= rating
                    ? 'bg-highlight border-highlight-strong text-ink font-bold scale-110'
                    : 'border-line text-ink-soft hover:bg-bg-soft'
                }`}
              >
                {n}
              </button>
            ))}
            {rating > 0 && (
              <button
                onClick={() => setRating(0)}
                className="ml-2 text-xs text-ink-soft hover:text-ink self-center"
              >
                지우기
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-ink block mb-2">
            메모 <span className="text-ink-soft font-normal">(선택)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="기억나는 표현, 어려웠던 부분, 한 마디..."
            rows={3}
            className="w-full px-3 py-2 border border-line rounded-xl bg-white focus:outline-none focus:border-accent resize-none text-sm"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-accent text-bg rounded-2xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving ? '저장 중...' : '저장 후 표현 박제 →'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2.5 border border-line text-ink-soft rounded-2xl text-sm hover:bg-bg-soft disabled:opacity-40 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
