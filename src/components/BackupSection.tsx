import { useRef, useState } from 'react'
import {
  buildBackup,
  downloadBackup,
  parseBackupFile,
  summarizeBackup,
  importBackupMerge,
  importBackupReplace,
  type BackupFile,
  type BackupSummary,
  type ImportResult,
} from '@/lib/backup'

export function BackupSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [includeTurns, setIncludeTurns] = useState(true)
  const [includeNickname, setIncludeNickname] = useState(false)

  const [pendingBackup, setPendingBackup] = useState<{
    file: BackupFile
    summary: BackupSummary
  } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  async function handleExport() {
    setExporting(true)
    try {
      const backup = await buildBackup({ includeTurns, includeNickname })
      downloadBackup(backup)
    } catch (e) {
      console.warn('[backup] export 실패:', e)
      alert('내보내기 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setExporting(false)
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportResult(null)
    setPendingBackup(null)

    try {
      const text = await file.text()
      const parsed = parseBackupFile(text)
      const summary = summarizeBackup(parsed)
      setPendingBackup({ file: parsed, summary })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '백업 파일 읽기 실패')
    } finally {
      // input 초기화 (같은 파일 다시 선택 가능하게)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleConfirmImport(mode: 'merge' | 'replace') {
    if (!pendingBackup) return

    if (mode === 'replace') {
      const confirmText =
        '⚠️ Replace 모드는 모든 기존 데이터를 지우고 백업으로 교체합니다.\n' +
        '되돌릴 수 없어요. 정말 진행할까요?'
      if (!confirm(confirmText)) return
    }

    setImporting(true)
    setImportError(null)
    try {
      const result =
        mode === 'merge'
          ? await importBackupMerge(pendingBackup.file)
          : await importBackupReplace(pendingBackup.file)
      setImportResult(result)
      setPendingBackup(null)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '복원 실패')
    } finally {
      setImporting(false)
    }
  }

  function handleCancelImport() {
    setPendingBackup(null)
    setImportError(null)
  }

  return (
    <section className="border border-line bg-white rounded-2xl p-5 shadow-sm space-y-5">
      <div>
        <h2 className="font-display italic text-lg text-ink mb-1">
          백업 · 복원
        </h2>
        <p className="text-xs text-ink-soft leading-relaxed">
          데이터는 이 브라우저에만 저장돼요. 디바이스를 갈아타거나 캐시가 날아갈 때를 대비해 JSON 파일로 백업하세요.
        </p>
      </div>

      {/* EXPORT */}
      <div className="border-t border-line pt-4 space-y-3">
        <h3 className="text-sm font-medium text-ink">내보내기</h3>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeTurns}
              onChange={(e) => setIncludeTurns(e.target.checked)}
              className="accent-accent"
            />
            솔로 회화 transcript 포함
            <span className="text-xs text-ink-soft">(파일 사이즈 ↑)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeNickname}
              onChange={(e) => setIncludeNickname(e.target.checked)}
              className="accent-accent"
            />
            닉네임 포함
          </label>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full px-4 py-2.5 bg-accent text-bg rounded-2xl text-sm font-medium hover:opacity-90 disabled:opacity-40"
        >
          {exporting ? '내보내는 중...' : '📥 JSON으로 내보내기'}
        </button>
      </div>

      {/* IMPORT */}
      <div className="border-t border-line pt-4 space-y-3">
        <h3 className="text-sm font-medium text-ink">불러오기</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileSelected}
          className="hidden"
        />
        {!pendingBackup && !importResult && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2.5 border border-line text-ink rounded-2xl text-sm hover:bg-bg-soft hover:border-accent transition-colors"
          >
            📂 백업 파일 선택
          </button>
        )}

        {importError && (
          <div className="border border-warn bg-warn/10 rounded-xl p-3 text-sm text-warn whitespace-pre-wrap">
            {importError}
          </div>
        )}

        {pendingBackup && (
          <PendingPreview
            summary={pendingBackup.summary}
            importing={importing}
            onConfirm={handleConfirmImport}
            onCancel={handleCancelImport}
          />
        )}

        {importResult && (
          <ImportResultView
            result={importResult}
            onDismiss={() => setImportResult(null)}
          />
        )}
      </div>
    </section>
  )
}

function PendingPreview({
  summary,
  importing,
  onConfirm,
  onCancel,
}: {
  summary: BackupSummary
  importing: boolean
  onConfirm: (mode: 'merge' | 'replace') => void
  onCancel: () => void
}) {
  const date = new Date(summary.exportedAt)
  return (
    <div className="border-2 border-accent gradient-card rounded-2xl p-4 space-y-3">
      <div>
        <p className="text-xs uppercase text-accent tracking-wider font-semibold">
          ✓ 백업 파일 읽음
        </p>
        <p className="text-xs text-ink-soft mt-1">
          내보낸 시각:{' '}
          {date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          · schema v{summary.schemaVersion}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="회화" value={summary.sessions} />
        <Stat label="표현" value={summary.phrases} />
        <Stat label="단어" value={summary.vocabulary} />
        <Stat label="시나리오" value={summary.scenarios} />
        <Stat label="turns" value={summary.turns} />
        <Stat label="닉네임" value={summary.hasNickname ? '있음' : '없음'} />
      </div>

      <div className="border-t border-line pt-3 space-y-2">
        <p className="text-xs text-ink-soft leading-relaxed">
          <span className="text-ink font-medium">Merge</span> — 기존 데이터 유지하고 백업과 합침. 중복은 자동 제거. <span className="text-warn">turns는 건너뜀</span> (sessionId 매핑 손실).<br />
          <span className="text-ink font-medium">Replace</span> — 기존 데이터 모두 삭제하고 백업으로 교체. <span className="text-warn">되돌릴 수 없음.</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onConfirm('merge')}
            disabled={importing}
            className="px-3 py-2 bg-accent text-bg rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40"
          >
            {importing ? '...' : 'Merge (안전)'}
          </button>
          <button
            onClick={() => onConfirm('replace')}
            disabled={importing}
            className="px-3 py-2 border-2 border-warn text-warn rounded-xl text-sm font-medium hover:bg-warn/10 disabled:opacity-40"
          >
            {importing ? '...' : 'Replace (위험)'}
          </button>
        </div>
        <button
          onClick={onCancel}
          disabled={importing}
          className="w-full px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
        >
          취소
        </button>
      </div>
    </div>
  )
}

function ImportResultView({
  result,
  onDismiss,
}: {
  result: ImportResult
  onDismiss: () => void
}) {
  return (
    <div className="border-2 border-teal gradient-card-teal rounded-2xl p-4 space-y-2">
      <p className="text-sm font-medium text-teal">
        ✓ {result.mode === 'merge' ? 'Merge' : 'Replace'} 복원 완료
      </p>
      <div className="text-xs text-ink-soft space-y-0.5 leading-relaxed">
        <Row label="회화" r={result.sessions} />
        <Row label="표현" r={result.phrases} />
        <Row label="단어" r={result.vocabulary} />
        <Row label="시나리오" r={result.scenarios} />
        <Row label="turns" r={result.turns} />
        {result.nicknameUpdated && (
          <p className="text-accent">✓ 닉네임 업데이트됨</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="w-full px-3 py-1.5 mt-2 bg-teal text-bg rounded-xl text-sm hover:opacity-90"
      >
        확인
      </button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl p-2 border border-line">
      <p className="font-display italic text-base text-accent leading-none">
        {value}
      </p>
      <p className="text-xs text-ink-soft mt-0.5">{label}</p>
    </div>
  )
}

function Row({
  label,
  r,
}: {
  label: string
  r: { inserted: number; skipped: number }
}) {
  return (
    <p>
      {label}: <span className="text-ink">+{r.inserted}</span>
      {r.skipped > 0 && (
        <span className="text-ink-soft"> · 건너뜀 {r.skipped}</span>
      )}
    </p>
  )
}
