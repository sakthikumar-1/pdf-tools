import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faSpinner,
  faCircleCheck
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_CLIENT_ID } from '../config/auth';
import { loadGoogleGsi } from '../utils/loadGoogleGsi';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithGoogle, isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const googleBtnRef = useRef(null);

  const handleCredentialResponse = useCallback(async (response) => {
    if (!response || !response.credential) {
      setError('Google Sign-In was cancelled or did not return an ID token.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Send Google ID token to backend for cryptographic signature & claim verification
      await loginWithGoogle({
        credential: response.credential,
        token_type: 'id_token'
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/account');
      }, 700);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  const initGoogleId = useCallback(() => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'filled_black' : 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320
          });
        }
      } catch (err) {
        console.warn('Google GSI initialization error:', err);
      }
    }
  }, [handleCredentialResponse]);

  useEffect(() => {
    let mounted = true;
    loadGoogleGsi()
      .then(() => {
        if (mounted) initGoogleId();
      })
      .catch((err) => {
        console.warn('GSI load warning:', err);
      });

    return () => {
      mounted = false;
    };
  }, [initGoogleId]);

  const handleGoogleSignInClick = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loadGoogleGsi();
      if (window.google?.accounts?.id) {
        initGoogleId();
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setIsLoading(false);
            const renderedBtn = googleBtnRef.current?.querySelector('div[role="button"]');
            if (renderedBtn) {
              renderedBtn.click();
            } else {
              setError('Google Sign-In prompt could not open. Please ensure popups and third-party cookies are allowed.');
            }
          } else if (notification.isDismissedMoment()) {
            setIsLoading(false);
          }
        });
      } else {
        setError('Google Sign-In is still connecting. Please try again in a moment.');
        setIsLoading(false);
      }
    } catch (e) {
      setError('Could not connect to Google. Please check your connection and try again.');
      setIsLoading(false);
    }
  };

  if (isAuthenticated && !success) {
    return (
      <div className="login-page-container">
        <div className="login-card">
          <Link to="/" className="login-back-link">
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to Tools</span>
          </Link>
          <div className="login-header">
            <FontAwesomeIcon icon={faCircleCheck} size="3x" style={{ color: 'var(--color-success)', marginBottom: '1rem' }} />
            <h1 className="login-title">Already Signed In</h1>
            <p className="login-subtitle">
              You are currently signed in as <strong>{user?.email}</strong>.
            </p>
          </div>
          <div className="login-actions">
            <button className="btn btn-primary btn-md" onClick={() => navigate('/account')}>
              Go to Account Settings
            </button>
            <button className="btn btn-secondary btn-md" onClick={() => navigate('/')}>
              Browse PDF Tools
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-container">
      <div className="login-card">
        <Link to="/" className="login-back-link">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Tools</span>
        </Link>

        <div className="login-header">
          <div className="login-logo-mark">
            <img src="/logo.png" alt="Simatrix Logo" className="login-logo-img" />
          </div>
          <h1 className="login-title">Sign in to Simatrix PDF</h1>
          <p className="login-subtitle">
            Sign in with Google and get five free AI requests.
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
            <FontAwesomeIcon icon={faCircleCheck} size="3x" style={{ color: 'var(--color-success)', marginBottom: '0.75rem' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-heading)', marginBottom: '0.25rem' }}>Successfully Signed In</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Redirecting to your workspace...</p>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(217, 75, 75, 0.1)', border: '1px solid rgba(217, 75, 75, 0.35)', borderRadius: '8px', color: 'var(--color-error)', fontSize: '0.82rem', fontWeight: 500, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div className="login-actions">
              <div className="google-signin-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', width: '100%' }} />
                
                {/* Fallback branded button if GSI container is not yet populated */}
                <button
                  type="button"
                  className="google-signin-btn"
                  onClick={handleGoogleSignInClick}
                  disabled={isLoading}
                  style={googleBtnRef.current?.children?.length ? { display: 'none' } : { marginTop: '0.25rem' }}
                >
                  {isLoading ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" className="google-svg-icon" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                  <span className="btn-main-title">
                    {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
                  </span>
                </button>
              </div>

              <p className="login-modal-support-text" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', margin: '0.5rem 0 0 0', fontWeight: 500 }}>
                Five AI requests included with your account.
              </p>

              <div className="login-modal-legal" style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.5rem', lineHeight: 1.45 }}>
                By signing in, you agree to our{' '}
                <Link to="/privacy" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                  Privacy Policy
                </Link>.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
