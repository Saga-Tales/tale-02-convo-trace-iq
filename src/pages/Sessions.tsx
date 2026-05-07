export function Sessions() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl text-ink">기록</h1>
        <p className="text-ink-soft text-sm mt-1">
          지나온 회화 세션들
        </p>
      </header>

      <section className="border border-line bg-white rounded-xl p-5 shadow-sm">
        <p className="text-sm text-ink-soft leading-relaxed">
          Day 2부터 시나리오 시작/종료 시 자동 기록.
        </p>
      </section>
    </div>
  )
}
