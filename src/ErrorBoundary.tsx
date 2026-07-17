import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  darkMode?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { darkMode = false } = this.props;

    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: darkMode ? '#0d1117' : '#f5f5ef',
            color: darkMode ? '#e0f0e8' : '#1b3022',
            padding: 32,
            gap: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Đã xảy ra lỗi</div>
          <div
            style={{
              fontSize: 12,
              color: darkMode ? '#6a9a7a' : '#5a7a6a',
              maxWidth: 320,
              lineHeight: 1.6,
            }}
          >
            {this.state.error?.message ?? 'Lỗi không xác định'}
          </div>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: 8,
              padding: '10px 24px',
              borderRadius: 12,
              border: '1px solid rgba(72,255,150,0.3)',
              background: 'rgba(72,255,150,0.1)',
              color: '#48ff96',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            ↺ Thử Lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
