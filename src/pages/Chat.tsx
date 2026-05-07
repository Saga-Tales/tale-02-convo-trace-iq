export function Chat() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl text-ink">회화</h1>
        <p className="text-ink-soft text-sm mt-1">
          시나리오를 받고 영어로 대화해요. 막히는 부분은 자동으로 박제됩니다.
        </p>
      </header>

      <section className="border border-line bg-white rounded-xl p-5 shadow-sm">
        <p className="text-sm text-ink-soft leading-relaxed">
          Day 2에서 구현 — 시나리오 생성 (난이도/카테고리/자유 입력) → 시작/종료 흐름 →
          세션 저장.
        </p>
      </section>
    </div>
  )
}
