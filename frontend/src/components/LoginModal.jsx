import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilePdf, 
  faXmark, 
  faShieldHalved, 
  faArrowRight, 
  faSpinner, 
  faCircleCheck,
  faBolt
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_CLIENT_ID } from '../config/auth';
import './LoginModal.css';

export default function LoginModal({ isOpen, onClose }) {
  const { loginWithGoogle, loginAsGuest, isAuthenticated, user, logout } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const tokenClientRef = useRef(null);

  // Initialize Google OAuth2 Token Client
  useEffect(() => {
    if (!isOpen) return;

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
                    setSuccess(false);
                    onClose();
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
                setError('Google OAuth Error 400: origin_mismatch for local address. Use 1-Click Guest Sign-In below or register your origin in Google Cloud Console.');
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
  }, [isOpen, loginWithGoogle, onClose]);

  if (!isOpen) return null;

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
              setTimeout(() => { setSuccess(false); onClose(); }, 700);
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
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Guest sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomEmailSignIn = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const cleanInput = (emailInput || '').trim();
      if (!cleanInput) {
        // If left empty, sign in as Guest immediately
        await loginAsGuest();
      } else if (cleanInput.includes('@')) {
        await loginWithGoogle({
          email: cleanInput,
          name: nameInput.trim() || cleanInput.split('@')[0],
          avatar_url: ''
        });
      } else {
        // User typed just a nickname or name without @
        await loginWithGoogle({
          email: `${cleanInput.toLowerCase().replace(/[^a-z0-9_]/g, '')}@simatrix.local`,
          name: cleanInput,
          avatar_url: '',
          is_guest: true
        });
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Sign In">
      <div className="login-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="login-modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <div className="login-modal-header">
          <span className="login-brand-icon">
            <img src="/logo.png" alt="Simatrix Logo" className="modal-logo-img" />
          </span>
          <h2 className="login-modal-title">Sign in to Simatrix PDF</h2>
          <p className="login-modal-subtitle">
            Access optional document history log and personalized workspace preferences.
          </p>
        </div>

        <div className="login-modal-body">
          {success ? (
            <div className="login-success-state">
              <FontAwesomeIcon icon={faCircleCheck} className="login-success-icon" />
              <h3>Successfully Signed In</h3>
              <p>Welcome to Simatrix PDF Tools.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="login-error-alert" role="alert">
                  <span>{error}</span>
                </div>
              )}

              {/* 1-Click Instant Guest Sign-In Button */}
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

              {/* Direct One-Click Google OAuth Button */}
              <button
                type="button"
                className="google-signin-btn"
                onClick={handleGoogleSignInClick}
                disabled={isLoading}
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
                <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>

              <div className="login-divider">
                <span>or enter email or nickname</span>
              </div>

              {/* Direct email or username sign-in */}
              <form onSubmit={handleCustomEmailSignIn} className="email-login-form">
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="your.email@gmail.com or nickname"
                  className="login-text-input"
                />
                <button
                  type="submit"
                  className="btn btn-secondary btn-md login-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? 'Connecting...' : 'Sign in'}
                </button>
              </form>

              <div className="login-privacy-callout">
                <FontAwesomeIcon icon={faShieldHalved} className="callout-icon" />
                <p>
                  <strong>Zero File Storage:</strong> Signing in only associates conversion timestamps and metadata with your session. Your document contents are never retained or saved on our servers.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="login-modal-footer">
          <button
            type="button"
            className="continue-free-btn"
            onClick={onClose}
          >
            <span>Continue browsing without signing in</span>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      </div>
    </div>
  );
}
