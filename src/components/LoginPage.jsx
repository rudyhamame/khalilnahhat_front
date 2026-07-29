import { useState } from 'react';
import loginImage from '../assets/images/login.png';

function LoginPage({
  isAuthenticated,
  username,
  loginError,
  signupError,
  onLogin,
  onSignup,
  onLogout,
}) {
  const [authMode, setAuthMode] = useState('signin');
  const [formUsername, setFormUsername] = useState(username || '');
  const [password, setPassword] = useState('');
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    email: '',
    phoneNumber: '',
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin({ username: formUsername, password });
  };

  const handleSignup = (event) => {
    event.preventDefault();
    onSignup(signupForm);
  };

  return (
    <main className="auth-page" style={{ '--auth-page-image': `url(${loginImage})` }}>
      <section className="auth-layout">
        <div className="section-label auth-page-title">
          <p className="section-kicker">KN//06</p>
          <h2>{isAuthenticated ? 'DASHBOARD ACCESS' : 'LOGIN / SIGN UP'}</h2>
        </div>

        <div className="auth-shell">
          <div className="auth-panel">
            {isAuthenticated ? (
              <div className="auth-state">
                <p className="detail-label">SIGNED IN</p>
                <h2>{username}</h2>
                <a className="primary-button" href="#admin">
                  OPEN CONTENT CONTROL
                </a>
                <button type="button" className="secondary-button" onClick={onLogout}>
                  LOG OUT
                </button>
              </div>
            ) : (
              <div className="auth-card-switcher">
                <div className="auth-mode-toggle" role="tablist" aria-label="Authentication mode">
                  <button
                    type="button"
                    className={authMode === 'signin' ? 'is-active' : ''}
                    onClick={() => setAuthMode('signin')}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    className={authMode === 'signup' ? 'is-active' : ''}
                    onClick={() => setAuthMode('signup')}
                  >
                    Sign Up
                  </button>
                </div>

                {authMode === 'signin' ? (
                  <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-form-block">
                      <div className="auth-block-head">
                        <h2>Sign In</h2>
                      </div>
                      <label htmlFor="username">Username</label>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        value={formUsername}
                        onChange={(event) => setFormUsername(event.target.value)}
                        autoComplete="username"
                      />
                      <label htmlFor="password">Password</label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                      />
                      {loginError ? <p className="auth-error">{loginError}</p> : null}
                      <button type="submit" className="primary-button">
                        SIGN IN
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setAuthMode('signup')}
                      >
                        CREATE ACCOUNT
                      </button>
                    </div>
                  </form>
                ) : (
                  <form className="auth-form" onSubmit={handleSignup}>
                    <div className="auth-form-block">
                      <div className="auth-block-head">
                        <p className="detail-label">NEW ACCOUNT</p>
                        <h2>Sign Up</h2>
                      </div>
                      <div className="auth-form-grid">
                        <label htmlFor="signup-first-name">
                          <span>First Name</span>
                          <input
                            id="signup-first-name"
                            type="text"
                            value={signupForm.firstName}
                            onChange={(event) =>
                              setSignupForm((current) => ({ ...current, firstName: event.target.value }))
                            }
                            autoComplete="given-name"
                          />
                        </label>
                        <label htmlFor="signup-last-name">
                          <span>Last Name</span>
                          <input
                            id="signup-last-name"
                            type="text"
                            value={signupForm.lastName}
                            onChange={(event) =>
                              setSignupForm((current) => ({ ...current, lastName: event.target.value }))
                            }
                            autoComplete="family-name"
                          />
                        </label>
                        <label htmlFor="signup-username">
                          <span>Username</span>
                          <input
                            id="signup-username"
                            type="text"
                            value={signupForm.username}
                            onChange={(event) =>
                              setSignupForm((current) => ({ ...current, username: event.target.value }))
                            }
                            autoComplete="username"
                          />
                        </label>
                        <label htmlFor="signup-password">
                          <span>Password</span>
                          <input
                            id="signup-password"
                            type="password"
                            value={signupForm.password}
                            onChange={(event) =>
                              setSignupForm((current) => ({ ...current, password: event.target.value }))
                            }
                            autoComplete="new-password"
                          />
                        </label>
                        <label htmlFor="signup-email">
                          <span>Email Address</span>
                          <input
                            id="signup-email"
                            type="email"
                            value={signupForm.email}
                            onChange={(event) =>
                              setSignupForm((current) => ({ ...current, email: event.target.value }))
                            }
                            autoComplete="email"
                          />
                        </label>
                        <label htmlFor="signup-phone">
                          <span>Phone Number</span>
                          <input
                            id="signup-phone"
                            type="tel"
                            value={signupForm.phoneNumber}
                            onChange={(event) =>
                              setSignupForm((current) => ({ ...current, phoneNumber: event.target.value }))
                            }
                            autoComplete="tel"
                          />
                        </label>
                      </div>
                      <p className="auth-helper">
                        Registering here creates a site account in the shared database. The username khalilnahhat is treated as admin.
                      </p>
                      {signupError ? <p className="auth-error">{signupError}</p> : null}
                      <button type="submit" className="primary-button">
                        CREATE ACCOUNT
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setAuthMode('signin')}
                      >
                        BACK TO SIGN IN
                      </button>
                    </div>
                  </form>
                )}

                <a className="secondary-button" href="#signal">
                  BACK TO SITE
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
