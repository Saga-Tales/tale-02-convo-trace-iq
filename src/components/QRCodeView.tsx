import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  value: string
  size?: number
}

export function QRCodeView({ value, size = 280 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [byteLength, setByteLength] = useState(0)

  useEffect(() => {
    if (!canvasRef.current) return
    setByteLength(value.length)
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1a1a1a',
        light: '#fff8ee',
      },
    })
      .then(() => setError(null))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'QR 생성 실패'
        setError(`QR 생성 실패: ${msg}. 데이터가 너무 클 수 있어요 (${value.length} bytes).`)
      })
  }, [value, size])

  if (error) {
    return (
      <div className="border border-warn bg-warn/10 rounded-xl p-3 text-sm text-warn">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        className="border-2 border-accent rounded-2xl shadow-md"
      />
      <p className="text-xs text-ink-soft">{byteLength} bytes</p>
    </div>
  )
}
