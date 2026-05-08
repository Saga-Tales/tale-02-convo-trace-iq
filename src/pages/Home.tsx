import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, type Session, type PhraseItem } from '@/db/schema'
import {
  selectRecallPhrases,
  calculateStreak,
  calculateMasteryDistribution,
  type MasteryDistribution,
} from '@/lib/recall'

interface Stats {
  totalSessions: number
  thisWeekSessions: number
  totalPhrases: number
  totalVocab: number
  ongoing: Session | null
  recent: Session[]
  streak: number
  recallPhrases: PhraseItem[]
  mastery: MasteryDistribution
}

export function Home() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    ;(async () => {
      const [allSessions, allPhrases, totalVocab, recallPhrases] = await Promise.all([
        db.sessions.orderBy('startedAt').reverse().toArray(),
        db.phrases.toArray(),
        db.vocabulary.count(),
        selectRecallPhrases(3),
      ])
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const thisWeek = allSessions.filter((s) => s.startedAt > weekAgo)
      const ongoing = allSessions.find((s) => s.endedAt === null) ?? null
      const recent = allSessions.filter((s) => s.endedAt !== null).slice(0, 3)
      const streak = calculateStreak(
        allSessions.filter((s) => s.endedAt !== null),
      )
      const mastery = calculateMasteryDistribution(allPhrases)

      setStats({
        totalSessions: allSessions.length,
        thisWeekSessions: thisWeek.length,
        totalPhrases: allPhrases.length,
        totalVocab,
        ongoing,
        recent,
        streak,
        recallPhrases,
        mastery,
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

      {/* 스트릭 + 이번 주 — 큰 카드 한 줄 */}
      {stats && stats.totalSessions > 0 && (
        <section className="grid grid-cols-2 gap-3">
          <div className="border border-line gradient-card rounded-2xl p-4 lift">
            <p className="text-xs uppercase text-ink-soft tracking-wider mb-1">
              스트릭
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-display italic text-4xl text-accent leading-none">
                {stats.streak}
              </p>
              <p className="text-sm text-ink-soft">일</p>
            </div>
            <p className="text-xs text-ink-soft mt-1">
              {stats.streak >= 3 ? '🔥 ' : ''}
              연속 회화
            </p>
          </div>
          <div className="border border-line gradient-card-teal rounded-2xl p-4 lift">
            <p className="text-xs uppercase text-ink-soft tracking-wider mb-1">
              이번 주
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-display italic text-4xl text-teal leading-none">
                {stats.thisWeekSessions}
              </p>
              <p className="text-sm text-ink-soft">번</p>
            </div>
            <p className="text-xs text-ink-soft mt-1">회화한 횟수</p>
          </div>
        </section>
      )}

      {/* 회상 예고 — 다음 회화에 등장할 표현 */}
      {stats && stats.recallPhrases.length > 0 && (
        <section className="border-2 border-accent-soft bg-white rounded-2xl p-5 lift">
          <header className="flex items-baseline justify-between mb-1">
            <h2 className="font-display italic text-lg text-accent">
              <span className="sig-star">다음 회화에서 만날 표현</span>
            </h2>
          </header>
          <p className="text-xs text-ink-soft mb-3 leading-relaxed">
            아직 익숙하지 않은 표현. 다음 시나리오에 자연스럽게 녹아들 거예요.
          </p>
          <div className="space-y-2">
            {stats.recallPhrases.map((p) => (
              <div
                key={p.id}
                className="bg-bg-soft rounded-xl p-3 border border-line"
              >
                <p className="font-display italic text-sm text-ink leading-relaxed">
                  "{p.expressionEn}"
                </p>
                <p className="text-xs text-ink-soft mt-1 flex items-center gap-2">
                  <span>→ {p.intentKo}</span>
                  <span className="text-accent">·</span>
                  <span className="text-accent">mastery {p.mastery}/10</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4개 stat — 누적 카운트 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="누적 회화"
          value={stats?.totalSessions ?? '—'}
          subtitle="번"
          accent="accent"
        />
        <StatCard
          label="박제된 단어"
          value={stats?.totalVocab ?? '—'}
          subtitle="개"
          accent="teal"
        />
        <StatCard
          label="박제된 표현"
          value={stats?.totalPhrases ?? '—'}
          subtitle="개"
          accent="accent"
        />
        <StatCard
          label="마스터한 표현"
          value={stats?.mastery.mastered ?? '—'}
          subtitle={
            stats && stats.mastery.total > 0
              ? `/ ${stats.mastery.total}`
              : '개'
          }
          accent="teal"
        />
      </div>

      {/* Mastery 분포 — 표현이 있을 때만 */}
      {stats && stats.mastery.total > 0 && (
        <section className="border border-line bg-white rounded-2xl p-5">
          <h2 className="font-display italic text-base text-ink mb-3">
            <span className="sig-star">표현 학습 진행</span>
          </h2>
          <MasteryBar dist={stats.mastery} />
          <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
            <div>
              <p className="font-display italic text-lg text-accent">
                {stats.mastery.fresh}
              </p>
              <p className="text-ink-soft">새로 학습</p>
            </div>
            <div>
              <p className="font-display italic text-lg text-pop">
                {stats.mastery.learning}
              </p>
              <p className="text-ink-soft">익숙해지는 중</p>
            </div>
            <div>
              <p className="font-display italic text-lg text-teal">
                {stats.mastery.mastered}
              </p>
              <p className="text-ink-soft">마스터</p>
            </div>
          </div>
        </section>
      )}

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
          <span className="sig-star">완성된 기능</span>
        </h2>
        <ul className="text-sm text-ink-soft space-y-1.5 leading-relaxed">
          <li>· 솔로 회화 + 페어 회화 (N명, QR 동기화)</li>
          <li>· 캡처 (한국어로?, 단어 뜻) + 자동 표현 추출</li>
          <li>· 회상 — 다음 회화에 학습 표현이 자연스럽게 등장</li>
          <li>· PWA 설치 + JSON 백업/복원 (설정에서)</li>
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

function MasteryBar({ dist }: { dist: MasteryDistribution }) {
  if (dist.total === 0) return null
  const freshPct = (dist.fresh / dist.total) * 100
  const learningPct = (dist.learning / dist.total) * 100
  const masteredPct = (dist.mastered / dist.total) * 100

  return (
    <div className="flex h-3 rounded-full overflow-hidden bg-bg-soft border border-line">
      {dist.fresh > 0 && (
        <div
          className="bg-accent"
          style={{ width: `${freshPct}%` }}
          title={`새로 학습: ${dist.fresh}`}
        />
      )}
      {dist.learning > 0 && (
        <div
          className="bg-pop"
          style={{ width: `${learningPct}%` }}
          title={`익숙해지는 중: ${dist.learning}`}
        />
      )}
      {dist.mastered > 0 && (
        <div
          className="bg-teal"
          style={{ width: `${masteredPct}%` }}
          title={`마스터: ${dist.mastered}`}
        />
      )}
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
