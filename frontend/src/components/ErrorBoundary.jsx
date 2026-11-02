import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faRotateRight, faHouse } from '@fortawesome/free-solid-svg-icons';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      // Clear reload guard flags so fresh HTML is requested
      sessionStorage.removeItem('simatrix_vite_preload_reload');
      const keys = Object.keys(sessionStorage);
      for (const k of keys) {
        if (k.startsWith('simatrix_chunk_reload_') || k.startsWith('simatrix_lazy_reload_')) {
          sessionStorage.removeItem(k);
        }
      }
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          backgroundColor: '#071116',
          color: '#F5F0E7',
          fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#101B21',
            border: '1px solid rgba(255, 194, 71, 0.25)',
            borderRadius: '16px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-light, #FFF0EF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E53935',
              fontSize: '1.75rem'
            }}>
              <FontAwesomeIcon icon={faTriangleExclamation} />
            </div>

            {(() => {
              const errMsg = this.state.error?.message || '';
              const isChunkOrCssError =
                errMsg.includes('Unable to preload CSS') ||
                errMsg.includes('Failed to fetch dynamically imported module') ||
                this.state.error?.name === 'ChunkLoadError';

              return (
                <>
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#FFFCF6',
                    marginBottom: '0.75rem'
                  }}>
                    {isChunkOrCssError ? 'Application Update Available' : 'Something went wrong loading this tool'}
                  </h2>

                  <p style={{
                    fontSize: '0.95rem',
                    color: 'rgba(245, 240, 231, 0.75)',
                    lineHeight: 1.6,
                    marginBottom: '1.75rem'
                  }}>
                    {isChunkOrCssError
                      ? 'A new version of Simatrix PDF has been deployed. Please refresh to load the latest tools, styles, and features.'
                      : 'An unexpected display issue occurred while rendering this component. You can reload the tool or return to the main dashboard.'}
                  </p>
                </>
              );
            })()}

            {this.state.error && (
              <div style={{
                textAlign: 'left',
                backgroundColor: '#071116',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.75rem',
                fontSize: '0.82rem',
                fontFamily: 'monospace',
                color: '#EF5350',
                overflowX: 'auto'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#E53935',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#C62828'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#E53935'}
              >
                <FontAwesomeIcon icon={faRotateRight} /> {this.state.error?.message?.includes('Unable to preload CSS') ? 'Refresh Application' : 'Reload Page'}
              </button>

              <a
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#17252C',
                  color: '#F5F0E7',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  transition: 'background 0.2s'
                }}
              >
                <FontAwesomeIcon icon={faHouse} /> Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
