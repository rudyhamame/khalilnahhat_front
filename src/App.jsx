import { useEffect, useMemo, useState } from 'react';
import AdminPage from './components/AdminPage';
import DashboardPage from './components/DashboardPage';
import LoginPage from './components/LoginPage';
import {
  analyzeLiveSession as analyzeLiveSessionRequest,
  analyzeLiveRequest as analyzeLiveRequestRequest,
  createLiveRequest as createLiveRequestRequest,
  createArchiveItem as createArchiveItemRequest,
  createLiveSession as createLiveSessionRequest,
  uploadLiveSessionAudio as uploadLiveSessionAudioRequest,
  deleteArchiveItem as deleteArchiveItemRequest,
  deleteLiveRequest as deleteLiveRequestRequest,
  deleteLiveSession as deleteLiveSessionRequest,
  fetchAdminLiveRequests,
  fetchBootstrap,
  fetchCurrentUser,
  login,
  reviewLiveRequest as reviewLiveRequestRequest,
  logout,
  signup,
  updateArchiveItem as updateArchiveItemRequest,
  updateLiveSession as updateLiveSessionRequest,
  updateLiveStream as updateLiveStreamRequest,
} from './lib/api';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import { archiveAssetMap, siteData } from './data/siteData';

const AUTH_TOKEN_STORAGE_KEY = 'khalil-auth-token';
const DEFAULT_LIVE_STREAM = {
  isLive: false,
  title: '',
  streamUrl: '',
  posterImage: '',
  statusLabel: 'Offline until Khalil starts the next OBS stream.',
  activeSessionId: '',
};

function readStorage(key, fallbackValue) {
  if (typeof window === 'undefined') {
    return fallbackValue;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function resolveArchiveImage(image) {
  return archiveAssetMap[image] || image;
}

function resolveSignedInRoute(user) {
  return user?.isAdmin ? '#admin' : '#dashboard';
}

function sortLiveSessions(items) {
  return [...items].sort((left, right) => {
    const orderDelta = (left.sortOrder || 0) - (right.sortOrder || 0);

    if (orderDelta !== 0) {
      return orderDelta;
    }

    return String(left.id || '').localeCompare(String(right.id || ''));
  });
}

function App() {
  const [routeHash, setRouteHash] = useState(() =>
    typeof window === 'undefined' ? '#signal' : window.location.hash || '#signal',
  );
  const [authToken, setAuthToken] = useState(() => readStorage(AUTH_TOKEN_STORAGE_KEY, ''));
  const [authUser, setAuthUser] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [signupError, setSignupError] = useState('');
  const [liveSessions, setLiveSessions] = useState(siteData.currentFrequency.sessions);
  const [archiveItems, setArchiveItems] = useState(siteData.archiveItems);
  const [liveStream, setLiveStream] = useState(DEFAULT_LIVE_STREAM);
  const [liveRequests, setLiveRequests] = useState([]);
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setRouteHash(window.location.hash || '#signal');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, JSON.stringify(authToken));
  }, [authToken]);

  useEffect(() => {
    let isCancelled = false;

    async function bootstrap() {
      try {
        const [content, me] = await Promise.all([
          fetchBootstrap(),
          authToken ? fetchCurrentUser(authToken).catch(() => null) : Promise.resolve(null),
        ]);

        if (isCancelled) {
          return;
        }

        if (Array.isArray(content.liveSessions)) {
          setLiveSessions(sortLiveSessions(content.liveSessions));
        }

        if (Array.isArray(content.archiveItems)) {
          setArchiveItems(content.archiveItems);
        }

        if (content.liveStream) {
          setLiveStream((currentValue) => ({
            ...currentValue,
            ...content.liveStream,
          }));
        }

        if (me?.user) {
          setAuthUser(me.user);
          if (me.user.isAdmin) {
            const requestPayload = await fetchAdminLiveRequests(authToken).catch(() => ({ items: [] }));
            if (!isCancelled) {
              setLiveRequests(Array.isArray(requestPayload.items) ? requestPayload.items : []);
            }
          } else {
            setLiveRequests([]);
          }
        } else {
          setAuthUser(null);
          setAuthToken('');
          setLiveRequests([]);
        }
      } catch {
        if (!isCancelled) {
          setAuthUser(null);
        }
      } finally {
        if (!isCancelled) {
          setIsSessionReady(true);
        }
      }
    }

    bootstrap();

    return () => {
      isCancelled = true;
    };
  }, [authToken]);

  const isAuthenticated = Boolean(authUser?.isAdmin);
  const resolvedArchiveItems = useMemo(
    () =>
      archiveItems.map((item) => ({
        ...item,
        image: resolveArchiveImage(item.image),
      })),
    [archiveItems],
  );
  const currentView = useMemo(() => {
    if (
      (typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/services') ||
      routeHash === '#services'
    ) {
      return 'services';
    }

    if (routeHash === '#login') {
      return 'login';
    }

    if (routeHash.startsWith('#dashboard')) {
      return 'dashboard';
    }

    if (routeHash.startsWith('#admin')) {
      return 'admin';
    }

    return 'site';
  }, [routeHash]);

  const handleLogin = async ({ username, password }) => {
    try {
      const result = await login({ username, password });
      setAuthToken(result.token);
      setAuthUser(result.user);
      setLoginError('');
      setSignupError('');
      window.location.hash = resolveSignedInRoute(result.user);
    } catch (error) {
      setLoginError(error.message || 'Incorrect username or password.');
    }
  };

  const handleSignup = async (payload) => {
    try {
      const result = await signup(payload);
      setAuthToken(result.token);
      setAuthUser(result.user);
      setSignupError('');
      setLoginError('');
      window.location.hash = resolveSignedInRoute(result.user);
    } catch (error) {
      setSignupError(error.message || 'Unable to create account.');
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await logout(authToken);
      } catch {
        // Ignore logout request failures and clear the local session anyway.
      }
    }

    setAuthToken('');
    setAuthUser(null);
    setLoginError('');
    setSignupError('');
    window.location.hash = '#login';
  };

  const addLiveSession = async (session) => {
    if (!session.track.trim()) {
      return;
    }

    const result = await createLiveSessionRequest(session, authToken);
    setLiveSessions((currentSessions) => sortLiveSessions([...currentSessions, result.item]));
  };

  const uploadLiveSessionAudio = async (file) => {
    return uploadLiveSessionAudioRequest(file, authToken);
  };

  const analyzeLiveSession = async (payload) => {
    return analyzeLiveSessionRequest(payload, authToken);
  };

  const updateLiveSession = async (sessionId, nextValues) => {
    const result = await updateLiveSessionRequest(sessionId, nextValues, authToken);
    setLiveSessions((currentSessions) =>
      sortLiveSessions(currentSessions.map((session) => (session.id === sessionId ? result.item : session))),
    );
  };

  const deleteLiveSession = async (sessionId) => {
    await deleteLiveSessionRequest(sessionId, authToken);
    setLiveSessions((currentSessions) => currentSessions.filter((session) => session.id !== sessionId));
  };

  const updateLiveStream = async (nextValues) => {
    const result = await updateLiveStreamRequest(nextValues, authToken);
    setLiveStream((currentValue) => ({
      ...currentValue,
      ...result.item,
    }));
  };

  const analyzeLiveRequest = async (payload) => {
    return analyzeLiveRequestRequest(payload);
  };

  const createLiveRequest = async (payload) => {
    return createLiveRequestRequest(payload);
  };

  const reviewLiveRequest = async (requestId, payload) => {
    const result = await reviewLiveRequestRequest(requestId, payload, authToken);
    setLiveRequests((currentRequests) =>
      currentRequests.map((item) => (item.id === requestId ? result.item : item)),
    );

    if (Array.isArray(result.liveSessions)) {
      setLiveSessions(sortLiveSessions(result.liveSessions));
    }

    return result;
  };

  const deleteLiveRequest = async (requestId) => {
    await deleteLiveRequestRequest(requestId, authToken);
    setLiveRequests((currentRequests) => currentRequests.filter((item) => item.id !== requestId));
  };

  useEffect(() => {
    if (authUser?.isAdmin && routeHash === '#dashboard') {
      window.location.hash = '#admin';
    }
  }, [authUser, routeHash]);

  const addArchiveItem = async (item) => {
    if (!item.title.trim()) {
      return;
    }

    const payload = {
      ...item,
      image: item.image.trim() || 'asset:archive-live',
      alt: item.alt.trim() || `${item.title.trim()} archive image`,
    };
    const result = await createArchiveItemRequest(payload, authToken);
    setArchiveItems((currentItems) => [...currentItems, result.item]);
  };

  const updateArchiveItem = async (itemId, nextValues) => {
    const result = await updateArchiveItemRequest(itemId, nextValues, authToken);
    setArchiveItems((currentItems) =>
      currentItems.map((item) => (item.id === itemId ? result.item : item)),
    );
  };

  const deleteArchiveItem = async (itemId) => {
    await deleteArchiveItemRequest(itemId, authToken);
    setArchiveItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  };

  if (currentView === 'services') {
    return <ServicesPage isSignedIn={Boolean(authUser)} />;
  }

  if (currentView === 'login') {
    return (
      <LoginPage
        isAuthenticated={isAuthenticated}
        username={authUser?.username || ''}
        loginError={loginError}
        signupError={signupError}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onLogout={handleLogout}
      />
    );
  }

  if (currentView === 'admin') {
    if (!isAuthenticated) {
      return (
        <LoginPage
          isAuthenticated={false}
          username=""
          loginError="Log in with the khalilnahhat account to access admin controls."
          signupError=""
          onLogin={handleLogin}
          onSignup={handleSignup}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <AdminPage
        username={authUser?.username || ''}
        liveSessions={liveSessions}
        liveStream={liveStream}
        archiveItems={resolvedArchiveItems}
        liveRequests={liveRequests}
        archiveFilters={siteData.archiveFilters}
        onLogout={handleLogout}
        onUpdateLiveStream={updateLiveStream}
        onAddLiveSession={addLiveSession}
        onUploadLiveSessionAudio={uploadLiveSessionAudio}
        onAnalyzeLiveSession={analyzeLiveSession}
        onUpdateLiveSession={updateLiveSession}
        onDeleteLiveSession={deleteLiveSession}
        onReviewLiveRequest={reviewLiveRequest}
        onDeleteLiveRequest={deleteLiveRequest}
        onAddArchiveItem={addArchiveItem}
        onUpdateArchiveItem={updateArchiveItem}
        onDeleteArchiveItem={deleteArchiveItem}
      />
    );
  }

  if (currentView === 'dashboard') {
    if (!isSessionReady && authToken) {
      return null;
    }

    if (!authUser) {
      return (
        <LoginPage
          isAuthenticated={false}
          username=""
          loginError="Log in to open your dashboard."
          signupError=""
          onLogin={handleLogin}
          onSignup={handleSignup}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <DashboardPage
        user={authUser}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <HomePage
      archiveItems={resolvedArchiveItems}
      liveSessions={liveSessions}
      liveStream={liveStream}
      isSignedIn={Boolean(authUser)}
      onAnalyzeLiveRequest={analyzeLiveRequest}
      onCreateLiveRequest={createLiveRequest}
    />
  );
}

export default App;
