import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faShieldHalved, 
  faWandMagicSparkles, 
  faClockRotateLeft,
  faSpinner,
  faCircleCheck,
  faBolt
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_CLIENT_ID } from '../config/auth';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithGoogle, loginAsGuest, isAuthenticated, user } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const tokenClientRef = useRef(null);

  useEffect(() => {
    const setupTokenClient = () => {
      if (window.google?.accounts?.oauth2) {
        try {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: async (tokenResponse) => {
              if (tokenResponse.error) {
                console.error('Google OAuth error:', tokenResponse);
                if (tokenResponse.error === 'popup_closed_by_user') {
                  setError('Google popup was closed. You can also sign in instantly as Guest or use email below.');
                } else {
                  setError(`Google sign-in error (${tokenResponse.error}). You can continue as Guest below.`);
                }
                setIsLoading(false);
                return;
              }

              if (tokenResponse.access_token) {
                try {
                  const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: {
                      Authorization: `Bearer ${tokenResponse.access_token}`
                    }
                  });

                  if (!userinfoRes.ok) {
                    throw new Error('Failed to retrieve Google profile information.');
                  }

                  const userInfo = await userinfoRes.json();
                  
                  await loginWithGoogle({
                    email: userInfo.email,
                    name: userInfo.name || userInfo.email.split('@')[0],
                    avatar_url: userInfo.picture || ''
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
              }
            },
            error_callback: (err) => {
              console.warn('Google Identity error_callback:', err);
              if (err.type === 'origin_mismatch') {
                setError('Google OAuth Error 400: origin_mismatch for local address. Use 1-Click Guest Sign-In or register your origin in Google Cloud Console.');
              } else {
                setError('Google Sign-In encountered an issue. You can sign in instantly as Guest below.');
              }
              setIsLoading(false);
            }
          });
        } catch (err) {
          console.warn('Google OAuth Token Client setup error:', err);
        }
      }
    };

    if (window.google?.accounts?.oauth2) {
      setupTokenClient();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(interval);
          setupTokenClient();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [loginWithGoogle, navigate]);

  const handleGoogleSignInClick = () => {
    setIsLoading(true);
    setError(null);
    try {
      if (tokenClientRef.current) {
        tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
      } else if (window.google?.accounts?.oauth2) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.access_token) {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              });
              const info = await res.json();
              await loginWithGoogle({
                email: info.email,
                name: info.name,
                avatar_url: info.picture
              });
              setSuccess(true);
              setTimeout(() => { navigate('/account'); }, 700);
            }
          },
          error_callback: (err) => {
            setError('Google Sign-In was closed or encountered an origin mismatch. Use 1-Click Guest Sign-In below.');
            setIsLoading(false);
          }
        });
        client.requestAccessToken({ prompt: 'select_account' });
      } else {
        setError('Google Sign-In is still connecting. You can sign in instantly as Guest below.');
        setIsLoading(false);
      }
    } catch (e) {
      setError('Could not connect to Google. Use 1-Click Guest Sign-In below.');
      setIsLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loginAsGuest();
      setSuccess(true);
      setTimeout(() => {
        navigate('/account');
      }, 700);
    } catch (err) {
      setError(err.message || 'Guest sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const cleanInput = (emailInput || '').trim();
      if (!cleanInput) {
        // Empty input -> Instant Guest login
        await loginAsGuest();
      } else if (cleanInput.includes('@')) {
        await loginWithGoogle({
          email: cleanInput,
          name: nameInput.trim() || cleanInput.split('@')[0],
          avatar_url: ''
        });
      } else {
        // Username without @
        await loginWithGoogle({
          email: `${cleanInput.toLowerCase().replace(/[^a-z0-9_]/g, '')}@simatrix.local`,
          name: cleanInput,
          avatar_url: '',
          is_guest: true
        });
      }
      setSuccess(true);
      setTimeout(() => {
        navigate('/account');
      }, 700);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
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
          <h1 className="login-title">Sign in to Simatrix</h1>
          <p className="login-subtitle">
            Save your document conversion history metadata and unlock personalized workspace preferences.
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <FontAwesomeIcon icon={faCircleCheck} size="3x" style={{ color: 'var(--color-success)', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-heading)', marginBottom: '0.5rem' }}>Successfully Signed In</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Redirecting to your workspace...</p>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(217, 75, 75, 0.1)', border: '1px solid rgba(217, 75, 75, 0.35)', borderRadius: '8px', color: 'var(--color-error)', fontSize: '0.86rem', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <div className="login-actions">
              {/* 1-Click Instant Guest Sign-In */}
              <button
                type="button"
                className="guest-signin-btn"
                onClick={handleGuestSignIn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faBolt} className="guest-bolt-icon" />
                )}
                <span>Continue as Guest (No Email Needed)</span>
              </button>

              <button 
                type="button" 
                className="google-signin-btn"
                onClick={handleGoogleSignInClick}
                disabled={isLoading}
              >
                {isLoading ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '0.5rem 0' }}>
                <span style={{ flex: 1, borderBottom: '1px solid var(--color-border)' }}></span>
                <span style={{ padding: '0 0.65rem' }}>or enter email or nickname</span>
                <span style={{ flex: 1, borderBottom: '1px solid var(--color-border)' }}></span>
              </div>

              <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="your.email@gmail.com or nickname"
                  style={{ flex: 1, padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-heading)', fontSize: '0.92rem', outline: 'none' }}
                />
                <button
                  type="submit"
                  className="btn btn-secondary btn-md"
                  disabled={isLoading}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Sign in
                </button>
              </form>

              <button 
                type="button" 
                className="continue-anonymous-btn"
                onClick={() => navigate('/')}
              >
                <span>Continue browsing without signing in &rarr;</span>
              </button>
            </div>

            <div className="login-features">
              <div className="login-feature-item">
                <FontAwesomeIcon icon={faShieldHalved} className="feature-item-icon" />
                <div>
                  <strong>Zero Document Retention</strong>
                  <p>Files are processed in memory and never stored on disk.</p>
                </div>
              </div>
              <div className="login-feature-item">
                <FontAwesomeIcon icon={faClockRotateLeft} className="feature-item-icon" />
                <div>
                  <strong>Metadata-Only History</strong>
                  <p>Only document names and processing timestamps are recorded.</p>
                </div>
              </div>
              <div className="login-feature-item">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="feature-item-icon" />
                <div>
                  <strong>Google Gemini AI Access</strong>
                  <p>Summarize complex documents with intelligent multi-mode briefing.</p>
                </div>
              </div>
            </div>

            <div className="login-footer">
              <p>
                By signing in, you agree to Simatrix Terms of Service and Privacy Policy. All 18 standard PDF utilities remain 100% free for anonymous users.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
