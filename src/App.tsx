import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Home } from '@/pages/Home'
import { Chat } from '@/pages/Chat'
import { Vocab } from '@/pages/Vocab'
import { Sessions } from '@/pages/Sessions'
import { Settings } from '@/pages/Settings'
import { ApiKeyGate } from '@/components/ApiKeyGate'

const NAV_ITEMS = [
  { to: '/', label: '홈', end: true },
  { to: '/chat', label: '회화', end: false },
  { to: '/vocab', label: '단어/표현', end: false },
  { to: '/sessions', label: '기록', end: false },
  { to: '/settings', label: '설정', end: false },
]

function Nav() {
  return (
    <nav className="border-b border-line bg-bg/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-1 overflow-x-auto">
        <span className="font-display italic text-xl mr-3 text-accent shrink-0">
          convo<span className="text-ink">·</span>trace
        </span>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `px-3 py-1 rounded-md text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-accent text-bg'
                  : 'text-ink-soft hover:text-ink hover:bg-bg-soft'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<ApiKeyGate><Home /></ApiKeyGate>} />
          <Route path="/chat" element={<ApiKeyGate><Chat /></ApiKeyGate>} />
          <Route path="/vocab" element={<ApiKeyGate><Vocab /></ApiKeyGate>} />
          <Route path="/sessions" element={<ApiKeyGate><Sessions /></ApiKeyGate>} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}
