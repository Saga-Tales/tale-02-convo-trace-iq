export function Home() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl text-ink">홈</h1>
        <p className="text-ink-soft text-sm mt-1">
          회화의 흔적을 따라가는 대시보드
        </p>
      </header>

      <section className="border border-line bg-white rounded-xl p-5 shadow-sm">
        <p className="text-sm text-ink-soft leading-relaxed">
          아직 기록이 없어요.{' '}
          <span className="text-accent font-medium">회화</span> 탭에서 첫 시나리오를 시작해보세요.
        </p>
      </section>

      <section className="border border-line bg-bg-soft rounded-xl p-5">
        <h2 className="font-display text-lg text-ink mb-3">다음 단계 (Day 2~)</h2>
        <ul className="text-sm text-ink-soft space-y-1.5 leading-relaxed">
          <li>· 시나리오 생성 (난이도 + 카테고리 + 자유 입력)</li>
          <li>· ko→en 짧은 답변 모드 + 단어 lookup 캡처</li>
          <li>· 회화 종료 후 표현 자동 추출 + keep/discard</li>
          <li>· 다음 시나리오 생성 시 mastery 낮은 표현 자연스럽게 등장</li>
          <li>· 페어 모드 (QR 시나리오 공유 + 캡처 동기화)</li>
        </ul>
      </section>
    </div>
  )
}
