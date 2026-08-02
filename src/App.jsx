import { useEffect, useMemo, useState } from 'react';
import AdminPage from './components/AdminPage';
import DashboardPage from './components/DashboardPage';
import LoginPage from './components/LoginPage';
import {
  analyzeLiveSession as analyzeLiveSessionRequest,
  searchYoutubeVideos as searchYoutubeVideosRequest,
  createLiveRequestCheckout as createLiveRequestCheckoutRequest,
  createServiceRequest as createServiceRequestRequest,
  createArchiveItem as createArchiveItemRequest,
  createLiveSession as createLiveSessionRequest,
  uploadLiveSessionAudio as uploadLiveSessionAudioRequest,
  deleteArchiveItem as deleteArchiveItemRequest,
  deleteLiveRequest as deleteLiveRequestRequest,
  convertLiveRequestToWav as convertLiveRequestToWavRequest,
  deleteLiveSession as deleteLiveSessionRequest,
  fetchAdminLiveRequests,
  fetchAdminServiceRequests,
  fetchAdminPrices,
  fetchBootstrap,
  fetchCurrentUser,
  fetchMyServiceRequests,
  login,
  reviewLiveRequest as reviewLiveRequestRequest,
  publishServiceQuote as publishServiceQuoteRequest,
  logout,
  signup,
  updateArchiveItem as updateArchiveItemRequest,
  updateLiveSession as updateLiveSessionRequest,
  updateLiveStream as updateLiveStreamRequest,
  updateAdminPrice as updateAdminPriceRequest,
} from './lib/api';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import { archiveAssetMap, siteData } from './data/siteData';

const AUTH_TOKEN_STORAGE_KEY = 'khalil-auth-token';
const AUTH_RETURN_STORAGE_KEY = 'khalil-auth-return';
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
  return user?.isAdmin ? '/admin/live-stream' : '/dashboard';
}

function normalizePathname(pathname) {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
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
  const [routePath, setRoutePath] = useState(() =>
    typeof window === 'undefined' ? '/' : normalizePathname(window.location.pathname),
  );
  const [authToken, setAuthToken] = useState(() => readStorage(AUTH_TOKEN_STORAGE_KEY, ''));
  const [authUser, setAuthUser] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [signupError, setSignupError] = useState('');
  const [liveSessions, setLiveSessions] = useState(siteData.currentFrequency.sessions);
  const [archiveItems, setArchiveItems] = useState(siteData.archiveItems);
  const [liveStream, setLiveStream] = useState(DEFAULT_LIVE_STREAM);
  const [liveRequests, setLiveRequests] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [servicePrices, setServicePrices] = useState([]);
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(normalizePathname(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
            const [requestPayload, serviceRequestPayload, pricePayload] = await Promise.all([
              fetchAdminLiveRequests(authToken).catch(() => ({ items: [] })),
              fetchAdminServiceRequests(authToken).catch(() => ({ items: [] })),
              fetchAdminPrices(authToken).catch(() => ({ items: [] })),
            ]);
            if (!isCancelled) {
              setLiveRequests(Array.isArray(requestPayload.items) ? requestPayload.items : []);
              setServiceRequests(Array.isArray(serviceRequestPayload.items) ? serviceRequestPayload.items : []);
              setServicePrices(Array.isArray(pricePayload.items) ? pricePayload.items : []);
            }
          } else {
            setLiveRequests([]);
            const serviceRequestPayload = await fetchMyServiceRequests(authToken).catch(() => ({ items: [] }));
            setServicePrices([]);
            if (!isCancelled) {
              setServiceRequests(Array.isArray(serviceRequestPayload.items) ? serviceRequestPayload.items : []);
            }
          }
        } else {
          setAuthUser(null);
          setAuthToken('');
          setLiveRequests([]);
          setServiceRequests([]);
          setServicePrices([]);
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
    if (routePath === '/services') {
      return 'services';
    }

    if (routePath === '/login') {
      return 'login';
    }

    if (routePath === '/dashboard' || routePath.startsWith('/dashboard/')) {
      return 'dashboard';
    }

    if (routePath === '/admin' || routePath.startsWith('/admin/')) {
      return 'admin';
    }

    return 'site';
  }, [routePath]);

  const handleLogin = async ({ username, password }) => {
    try {
      const result = await login({ username, password });
      setAuthToken(result.token);
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, JSON.stringify(result.token));
      setAuthUser(result.user);
      setLoginError('');
      setSignupError('');
      const returnPath = window.localStorage.getItem(AUTH_RETURN_STORAGE_KEY);
      window.localStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
      if (returnPath) {
        window.location.href = returnPath;
      } else {
        window.location.href = resolveSignedInRoute(result.user);
      }
    } catch (error) {
      setLoginError(error.message || 'Incorrect username or password.');
    }
  };

  const handleSignup = async (payload) => {
    try {
      const result = await signup(payload);
      setAuthToken(result.token);
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, JSON.stringify(result.token));
      setAuthUser(result.user);
      setSignupError('');
      setLoginError('');
      const returnPath = window.localStorage.getItem(AUTH_RETURN_STORAGE_KEY);
      window.localStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
      if (returnPath) {
        window.location.href = returnPath;
      } else {
        window.location.href = resolveSignedInRoute(result.user);
      }
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
    window.location.href = '/login';
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

  const searchYoutubeVideos = async (query) => {
    return searchYoutubeVideosRequest(query);
  };

  const createLiveRequest = async (payload) => {
    const result = await createLiveRequestCheckoutRequest(payload);
    if (result.checkoutUrl) {
      window.location.assign(result.checkoutUrl);
    }
    return result;
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

  const convertLiveRequestToWav = async (requestId) => {
    const result = await convertLiveRequestToWavRequest(requestId, authToken);
    setLiveRequests((currentRequests) =>
      currentRequests.map((item) => (item.id === requestId ? result.item : item)),
    );
    return result;
  };

  const createServiceRequest = async (payload) => {
    const result = await createServiceRequestRequest(payload, authToken);
    setServiceRequests((currentRequests) => [result.item, ...currentRequests]);
    return result;
  };

  const publishServiceQuote = async (requestId, payload) => {
    const result = await publishServiceQuoteRequest(requestId, payload, authToken);
    setServiceRequests((currentRequests) =>
      currentRequests.map((item) => (item.id === requestId ? result.item : item)),
    );
    return result;
  };

  const updateAdminPrice = async (priceId, payload) => {
    const result = await updateAdminPriceRequest(priceId, payload, authToken);
    setServicePrices((currentPrices) =>
      currentPrices.map((price) => (price.id === priceId ? result.item : price)),
    );
    return result;
  };

  useEffect(() => {
    if (authUser?.isAdmin && (routePath === '/dashboard' || routePath.startsWith('/dashboard/'))) {
      window.location.replace('/admin/live-stream');
    }
  }, [authUser, routePath]);

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
    return (
      <ServicesPage
        user={authUser}
        isSessionReady={isSessionReady}
        onCreateServiceRequest={createServiceRequest}
      />
    );
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
    if (!isSessionReady && authToken) {
      return null;
    }

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
        activePanel={routePath === '/admin/live-sessions'
          ? 'live-sessions'
          : routePath === '/admin/archive'
            ? 'archive'
          : routePath === '/admin/services'
            ? 'services'
            : routePath === '/admin/prices'
              ? 'prices'
            : 'live-stream'}
        username={authUser?.username || ''}
        liveSessions={liveSessions}
        liveStream={liveStream}
        archiveItems={resolvedArchiveItems}
        liveRequests={liveRequests}
        serviceRequests={serviceRequests}
        servicePrices={servicePrices}
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
        onConvertLiveRequestToWav={convertLiveRequestToWav}
        onPublishServiceQuote={publishServiceQuote}
        onUpdateAdminPrice={updateAdminPrice}
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
        serviceRequests={serviceRequests}
        activeView={routePath === '/dashboard/services' ? 'services' : 'session'}
        onLogout={handleLogout}
      />
    );
  }

  return (
      <HomePage
      activePage={routePath === '/live'
        ? 'live'
        : routePath === '/archive'
          ? 'archive'
          : routePath === '/dates'
            ? 'dates'
            : routePath === '/contact'
              ? 'contact'
              : 'signal'}
      archiveItems={resolvedArchiveItems}
      liveSessions={liveSessions}
      liveStream={liveStream}
      isSignedIn={Boolean(authUser)}
        onSearchYoutubeVideos={searchYoutubeVideos}
        onCreateLiveRequest={createLiveRequest}
    />
  );
}

export default App;
