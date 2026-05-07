import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, type Session } from '@/db/schema'

interface Stats {
  totalSessions: number
  thisWeekSessions: number
  ongoing: Session | null
  recent: Session[]
}

export function Home() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    ;(async () => {
      const all = await db.sessions
        .orderBy('startedAt')
        .reverse()
        .toArray()
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const thisWeek = all.filter((s) => s.startedAt > weekAgo)
      const ongoing = all.find((s) => s.endedAt === null) ?? null
      const recent = all.filter((s) => s.endedAt !== null).slice(0, 3)
      setStats({
        totalSessions: all.length,
        thisWeekSessions: thisWeek.length,
        ongoing,
        recent,
      })
    })()
  }, [])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl text-ink">홈</h1>
        <p className="text-ink-soft text-sm mt-1">
          회화의 흔적을 따라가는 대시보드
        </p>
      </header>

      {stats?.ongoing && (
        <Link
          to="/chat"
          className="block border border-accent bg-accent-soft rounded-xl p-4 hover:opacity-90 transition-opacity"
        >
          <p className="text-xs uppercase text-accent tracking-wider mb-1">
            진행 중
          </p>
          <p className="text-sm text-ink font-medium mb-1">
            {stats.ongoing.scenarioTitle}
          </p>
          <p className="text-sm text-accent">계속 회화하기 →</p>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="이번 주" value={stats?.thisWeekSessions ?? '—'} />
        <StatCard label="누적" value={stats?.totalSessions ?? '—'} />
      </div>

      {stats && stats.totalSessions === 0 && (
        <section className="border border-line bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-ink-soft leading-relaxed">
            아직 기록이 없어요.{' '}
            <Link to="/chat" className="text-accent underline">
              회화
            </Link>{' '}
            탭에서 첫 시나리오를 시작해보세요.
          </p>
        </section>
      )}

      {stats && stats.recent.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-ink mb-3">최근 회화</h2>
          <div className="space-y-2">
            {stats.recent.map((s) => (
              <RecentRow key={s.id} session={s} />
            ))}
          </div>
          <Link
            to="/sessions"
            className="inline-block mt-3 text-xs text-ink-soft hover:text-accent"
          >
            전체 기록 보기 →
          </Link>
        </section>
      )}

      <section className="border border-line bg-bg-soft rounded-xl p-5">
        <h2 className="font-display text-lg text-ink mb-3">다음 단계 (Day 3~)</h2>
        <ul className="text-sm text-ink-soft space-y-1.5 leading-relaxed">
          <li>· ko→en 짧은 답변 모드 + 단어 lookup 캡처 (Day 3)</li>
          <li>· 회화 종료 후 표현 자동 추출 + keep/discard (Day 4)</li>
          <li>· 다음 시나리오에 mastery 낮은 표현 자연스럽게 등장 (Day 5)</li>
          <li>· 페어 모드 QR 시나리오 공유 + 캡처 동기화 (Day 6)</li>
        </ul>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-line bg-white rounded-xl p-4 shadow-sm">
      <p className="text-xs uppercase text-ink-soft tracking-wider mb-1">
        {label}
      </p>
      <p className="font-display text-3xl text-accent leading-none">{value}</p>
    </div>
  )
}

function RecentRow({ session }: { session: Session }) {
  const date = new Date(session.startedAt)
  return (
    <Link
      to="/sessions"
      className="block border border-line bg-white rounded-md p-3 hover:bg-bg-soft transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink truncate flex-1 min-w-0">
          {session.scenarioTitle}
        </p>
        <p className="text-xs text-ink-soft shrink-0">
          {date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
        </p>
      </div>
      <p className="text-xs text-ink-soft mt-1">
        {session.mode === 'solo' ? '솔로' : '페어'} · {session.tags.join(', ')}
      </p>
    </Link>
  )
}
