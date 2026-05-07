import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'

interface Props {
  onResult: (data: string) => void
  /** 결과를 받은 후 자동으로 stop할지. default true */
  stopOnResult?: boolean
}

export function QRScanner({ onResult, stopOnResult = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const onResultRef = useRef(onResult)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    if (!videoRef.current) return
    const video = videoRef.current

    const scanner = new QrScanner(
      video,
      (result) => {
        onResultRef.current(result.data)
        if (stopOnResult) {
          scanner.stop()
        }
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment',
        maxScansPerSecond: 5,
      },
    )
    scannerRef.current = scanner

    scanner.start().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : '카메라 시작 실패'
      setError(msg)
    })

    return () => {
      scanner.stop()
      scanner.destroy()
      scannerRef.current = null
    }
  }, [stopOnResult])

  if (error) {
    return (
      <div className="border border-warn bg-warn/10 rounded-xl p-4 text-sm text-warn space-y-2">
        <p className="font-medium">카메라를 시작할 수 없어요.</p>
        <p className="text-xs">{error}</p>
        <p className="text-xs">
          브라우저의 카메라 권한이 차단됐는지 확인해주세요. iOS Safari는 https에서만 동작합니다.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-accent bg-bg">
      <video ref={videoRef} className="w-full block" />
    </div>
  )
}
