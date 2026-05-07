import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
          <div className="max-w-md w-full border border-line bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h1 className="font-display italic text-3xl text-accent">
              <span className="sig-star">앗,</span>
            </h1>
            <p className="text-ink">
              앱에 예상치 못한 문제가 발생했어요.
            </p>
            {this.state.error && (
              <pre className="text-xs text-ink-soft bg-bg-soft border border-line rounded-xl p-3 overflow-auto whitespace-pre-wrap break-words">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 bg-accent text-bg rounded-2xl text-sm font-medium hover:opacity-90 transition-opacity"
              >
                다시 시도
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2.5 border border-line text-ink-soft rounded-2xl text-sm hover:bg-bg-soft transition-colors"
              >
                새로고침
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
