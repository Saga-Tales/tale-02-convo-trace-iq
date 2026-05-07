import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, type Session } from '@/db/schema'

interface Stats {
  totalSessions: number
  thisWeekSessions: number
  totalPhrases: number
  totalVocab: number
  ongoing: Session | null
  recent: Session[]
}

export function Home() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    ;(async () => {
      const [allSessions, totalPhrases, totalVocab] = await Promise.all([
        db.sessions.orderBy('startedAt').reverse().toArray(),
        db.phrases.count(),
        db.vocabulary.count(),
      ])
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const thisWeek = allSessions.filter((s) => s.startedAt > weekAgo)
      const ongoing = allSessions.find((s) => s.endedAt === null) ?? null
      const recent = allSessions.filter((s) => s.endedAt !== null).slice(0, 3)
      setStats({
        totalSessions: allSessions.length,
        thisWeekSessions: thisWeek.length,
        totalPhrases,
        totalVocab,
        ongoing,
        recent,
      })
    })()
  }, [])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-5xl text-ink">
          <span className="text-teal">convo</span>
          <span className="text-ink">·</span>
          <span className="text-accent">trace</span>
        </h1>
        <p className="text-ink-soft text-sm mt-2">
          ✦ 회화의 흔적을 따라가는 대시보드
        </p>
      </header>

      {stats?.ongoing && (
        <Link
          to="/chat"
          className="block border-2 border-accent gradient-card rounded-2xl p-4 lift"
        >
          <p className="text-xs uppercase text-accent tracking-wider mb-1 font-semibold">
            ✦ 진행 중
          </p>
          <p className="text-base text-ink font-medium mb-1">
            {stats.ongoing.scenarioTitle}
          </p>
          <p className="text-sm text-accent">계속 회화하기 →</p>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="이번 주"
          value={stats?.thisWeekSessions ?? '—'}
          subtitle="회화"
          accent="accent"
        />
        <StatCard
          label="누적"
          value={stats?.totalSessions ?? '—'}
          subtitle="회화"
          accent="teal"
        />
        <StatCard
          label="박제된"
          value={stats?.totalPhrases ?? '—'}
          subtitle="표현"
          accent="accent"
        />
        <StatCard
          label="박제된"
          value={stats?.totalVocab ?? '—'}
          subtitle="단어"
          accent="teal"
        />
      </div>

      {stats && stats.totalSessions === 0 && (
        <section className="border border-line gradient-card rounded-2xl p-5">
          <p className="text-sm text-ink leading-relaxed">
            아직 기록이 없어요.{' '}
            <Link to="/chat" className="text-accent underline font-medium">
              회화
            </Link>{' '}
            탭에서 첫 시나리오를 시작해보세요. ✦
          </p>
        </section>
      )}

      {stats && stats.recent.length > 0 && (
        <section>
          <h2 className="font-display italic text-xl text-ink mb-3">
            <span className="sig-star">최근 회화</span>
          </h2>
          <div className="space-y-2">
            {stats.recent.map((s) => (
              <RecentRow key={s.id} session={s} />
            ))}
          </div>
          <Link
            to="/sessions"
            className="inline-block mt-3 text-xs text-ink-soft hover:text-accent transition-colors"
          >
            전체 기록 보기 →
          </Link>
        </section>
      )}

      <section className="border border-line bg-bg-soft rounded-2xl p-5">
        <h2 className="font-display italic text-lg text-ink mb-3">
          <span className="sig-star">다음 단계 (Day 5~)</span>
        </h2>
        <ul className="text-sm text-ink-soft space-y-1.5 leading-relaxed">
          <li>· 다음 시나리오에 mastery 낮은 표현 자연스럽게 등장 (Day 5)</li>
          <li>· 페어 모드 QR 시나리오 공유 + 캡처 동기화 (Day 6)</li>
        </ul>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string
  value: number | string
  subtitle: string
  accent: 'accent' | 'teal'
}) {
  const colorClass = accent === 'accent' ? 'text-accent' : 'text-teal'
  return (
    <div className="border border-line bg-white rounded-2xl p-4 shadow-sm lift">
      <p className="text-xs uppercase text-ink-soft tracking-wider mb-1">
        {label}
      </p>
      <p className={`font-display italic text-3xl leading-none ${colorClass}`}>
        {value}
      </p>
      <p className="text-xs text-ink-soft mt-1">{subtitle}</p>
    </div>
  )
}

function RecentRow({ session }: { session: Session }) {
  const date = new Date(session.startedAt)
  return (
    <Link
      to="/sessions"
      className="block border border-line bg-white rounded-xl p-3 hover:bg-bg-soft transition-colors"
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
