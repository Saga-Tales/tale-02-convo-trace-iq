import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, type Session } from '@/db/schema'

export function Sessions() {
  const [sessions, setSessions] = useState<Session[] | null>(null)

  useEffect(() => {
    db.sessions
      .orderBy('startedAt')
      .reverse()
      .toArray()
      .then(setSessions)
  }, [])

  if (sessions === null) {
    return <p className="text-ink-soft text-sm">불러오는 중...</p>
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl text-accent">
          <span className="sig-star">기록</span>
        </h1>
        <p className="text-ink-soft text-sm mt-1">지나온 회화 세션들</p>
      </header>

      {sessions.length === 0 ? (
        <section className="border border-line gradient-card rounded-2xl p-5">
          <p className="text-sm text-ink leading-relaxed">
            아직 회화 기록이 없어요.{' '}
            <Link to="/chat" className="text-accent underline font-medium">
              회화
            </Link>{' '}
            탭에서 첫 시나리오를 시작해보세요.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionCard({ session }: { session: Session }) {
  const ongoing = session.endedAt === null
  const duration = ongoing ? null : session.endedAt! - session.startedAt
  const started = new Date(session.startedAt)
  const dateStr = started.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  })
  const timeStr = started.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <article className="border border-line bg-white rounded-2xl p-4 shadow-sm lift">
      <header className="flex items-start justify-between mb-2 gap-3">
        <h3 className="font-display italic text-lg text-accent truncate min-w-0">
          {session.scenarioTitle}
        </h3>
        <div className="flex items-center gap-2 text-xs shrink-0">
          {ongoing && (
            <span className="px-2 py-0.5 bg-highlight rounded-full text-ink font-medium">
              진행 중
            </span>
          )}
          <span className="text-ink-soft">
            {session.mode === 'solo'
              ? '솔로'
              : `페어${session.partnerName ? ` · ${session.partnerName}` : ''}`}
          </span>
        </div>
      </header>
      <p className="text-sm text-ink-soft mb-3 leading-relaxed line-clamp-2">
        {session.scenarioBrief}
      </p>
      <footer className="text-xs text-ink-soft flex items-center gap-2 flex-wrap">
        <span>
          {dateStr} {timeStr}
        </span>
        <span>·</span>
        <span>{session.tags.join(', ')}</span>
        <span>·</span>
        <span>{session.difficulty}</span>
        {duration !== null && (
          <>
            <span>·</span>
            <span>{Math.max(1, Math.round(duration / 60000))}분</span>
          </>
        )}
        {session.rating && (
          <>
            <span>·</span>
            <span className="text-ink">★ {session.rating}</span>
          </>
        )}
      </footer>
      {session.note && (
        <p className="mt-2 pt-2 border-t border-line text-xs text-ink leading-relaxed italic">
          "{session.note}"
        </p>
      )}
      {ongoing && (
        <Link
          to="/chat"
          className="mt-3 inline-block text-sm text-accent underline font-medium"
        >
          이어서 진행 →
        </Link>
      )}
    </article>
  )
}
