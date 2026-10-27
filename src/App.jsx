import { useEffect, useMemo, useState } from 'react';
import AdminPage from './components/AdminPage';
import DashboardPage from './components/DashboardPage';
import LoginPage from './components/LoginPage';
import {
  createServiceRequest as createServiceRequestRequest,
  createArchiveItem as createArchiveItemRequest,
  createLiveSession as createLiveSessionRequest,
  uploadLiveSessionAudio as uploadLiveSessionAudioRequest,
  uploadLiveSessionCover as uploadLiveSessionCoverRequest,
  uploadLiveStreamPoster as uploadLiveStreamPosterRequest,
  deleteArchiveItem as deleteArchiveItemRequest,
  deleteLiveRequest as deleteLiveRequestRequest,
  convertLiveRequestToWav as convertLiveRequestToWavRequest,
  deleteLiveSession as deleteLiveSessionRequest,
  goLiveWebrtc as goLiveWebrtcRequest,
  endLiveWebrtc as endLiveWebrtcRequest,
  fetchAdminLiveRequests,
  fetchAdminServiceRequests,
  fetchAdminPrices,
  fetchAdminTransactions,
  fetchBootstrap,
  fetchCurrentUser,
  fetchConfirmedBookings,
  fetchMyServiceRequests,
  serviceRequestAction,
  login,
  googleLogin,
  reviewLiveRequest as reviewLiveRequestRequest,
  publishServiceQuote as publishServiceQuoteRequest,
  logout,
  signup,
  updateArchiveItem as updateArchiveItemRequest,
  updateLiveSession as updateLiveSessionRequest,
  updateLiveStream as updateLiveStreamRequest,
  updateAdminPrice as updateAdminPriceRequest,
} from './lib/api';
import renderEchoRoute from './echo/routes';
import { useLang } from './echo/i18n';
import './echo/echo.css';
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
  broadcastMode: 'youtube',
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
  const [routeSearch, setRouteSearch] = useState(() => typeof window === 'undefined' ? '' : window.location.search);
  useEffect(() => { window.dispatchEvent(new Event('echo:navigation')); }, [routePath]);
  useEffect(() => {
    if (routePath !== '/admin/archive') return;
    window.history.replaceState({}, '', '/admin/echo?tab=music-archive');
    setRoutePath('/admin/echo');
    setRouteSearch('?tab=music-archive');
  }, [routePath]);
  const echoLang = useLang();
  const [confirmedBookings, setConfirmedBookings] = useState([]);
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
  const [transactions, setTransactions] = useState([]);
  const [isSessionReady, setIsSessionReady] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.echoSessionReady=String(isSessionReady);
  },[isSessionReady]);

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(normalizePathname(window.location.pathname));
      setRouteSearch(window.location.search);
    };

    const handleLocalNavigation = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const next = new URL(link.href, window.location.href);
      if (next.origin !== window.location.origin || !['http:', 'https:'].includes(next.protocol)) return;
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;
      if (next.pathname.startsWith('/api/') || /\.[a-z0-9]{2,5}$/i.test(next.pathname)) return;
      event.preventDefault();
      window.history.pushState({}, '', next.pathname + next.search + next.hash);
      handlePopState();
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (next.hash) requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(decodeURIComponent(next.hash.slice(1)))?.scrollIntoView()));
    };
    document.addEventListener('click', handleLocalNavigation);
    window.addEventListener('popstate', handlePopState);
    return () => { window.removeEventListener('popstate', handlePopState); document.removeEventListener('click', handleLocalNavigation); };
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
            const [requestPayload, serviceRequestPayload, pricePayload, transactionPayload, bookingPayload] = await Promise.all([
              fetchAdminLiveRequests(authToken).catch(() => ({ items: [] })),
              fetchAdminServiceRequests(authToken).catch(() => ({ items: [] })),
              fetchAdminPrices(authToken).catch(() => ({ items: [] })),
              fetchAdminTransactions(authToken).catch(() => ({ items: [] })),
              fetchConfirmedBookings(authToken).catch(() => ({ items: [] })),
            ]);
            if (!isCancelled) {
              setLiveRequests(Array.isArray(requestPayload.items) ? requestPayload.items : []);
              setServiceRequests(Array.isArray(serviceRequestPayload.items) ? serviceRequestPayload.items : []);
              setServicePrices(Array.isArray(pricePayload.items) ? pricePayload.items : []);
              setTransactions(Array.isArray(transactionPayload.items) ? transactionPayload.items : []);
              setConfirmedBookings(Array.isArray(bookingPayload.items) ? bookingPayload.items : []);
            }
          } else {
            setLiveRequests([]);
            const serviceRequestPayload = await fetchMyServiceRequests(authToken).catch(() => ({ items: [] }));
            setServicePrices([]);
            setTransactions([]);
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
          setTransactions([]);
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      fetchBootstrap()
        .then((content) => {
          if (Array.isArray(content.liveSessions)) setLiveSessions(content.liveSessions);
          if (content.liveStream) {
            setLiveStream((currentValue) => ({
              ...currentValue,
              ...content.liveStream,
            }));
          }
        })
        .catch(() => {});
    }, 20000);

    return () => window.clearInterval(timer);
  }, []);

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

  const handleGoogleLogin = async payload => {
    const result = await googleLogin(payload);
    setAuthToken(result.token);
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, JSON.stringify(result.token));
    setAuthUser(result.user);
    setLoginError('');
    setSignupError('');
    const returnPath = window.localStorage.getItem(AUTH_RETURN_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
    window.location.href = returnPath?.startsWith('/') && !returnPath.startsWith('//') ? returnPath : resolveSignedInRoute(result.user);
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

  const uploadLiveSessionCover = async (file) => {
    return uploadLiveSessionCoverRequest(file, authToken);
  };

  const uploadLiveStreamPoster = async (file) => {
    return uploadLiveStreamPosterRequest(file, authToken);
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

  const goLiveWebrtc = async (title) => {
    const result = await goLiveWebrtcRequest({ title }, authToken);
    setLiveStream((currentValue) => ({
      ...currentValue,
      ...result.item,
    }));
    return { token: result.token, url: result.url, roomName: result.roomName };
  };

  const endLiveWebrtc = async () => {
    const result = await endLiveWebrtcRequest(authToken);
    setLiveStream((currentValue) => ({
      ...currentValue,
      ...result.item,
    }));
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

  const quoteAction = async (requestId, action, body, method) => {
    const result = await serviceRequestAction(requestId, action, body, authToken, method);
    if (result.item) {
      setServiceRequests((currentRequests) =>
        currentRequests.map((item) => (item.id === requestId ? result.item : item)),
      );
    }
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

  const refreshTransactions = async () => {
    const result = await fetchAdminTransactions(authToken);
    setTransactions(Array.isArray(result.items) ? result.items : []);
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

  const echoPage = renderEchoRoute(routePath, {
    lang: echoLang, user: authUser, token: authToken, isSessionReady, liveStream, liveSessions, onCreateServiceRequest: createServiceRequest, onLogout: handleLogout, search: routeSearch,
  });
  if (echoPage) {
    return echoPage;
  }

  if (currentView === 'login') {
    return (
      <LoginPage
        lang={echoLang}
        isAuthenticated={Boolean(authUser)}
        username={authUser?.username || ''}
        loginError={loginError}
        signupError={signupError}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onGoogleLogin={handleGoogleLogin}
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
        lang={echoLang}
          isAuthenticated={false}
          username=""
          loginError="Log in with the khalilnahhat account to access admin controls."
          signupError=""
          onLogin={handleLogin}
          onSignup={handleSignup}
          onGoogleLogin={handleGoogleLogin}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <AdminPage
        activePanel={routePath === '/admin/live-sessions'
          ? 'live-sessions'
          : (routePath === '/admin/accounts' || routePath === '/admin/youtube')
            ? 'accounts'
          : routePath === '/admin/archive'
            ? 'archive'
          : routePath === '/admin/services'
            ? 'services'
          : routePath === '/admin/prices'
              ? 'prices'
              : routePath === '/admin/transactions'
                ? 'transactions'
            : 'live-stream'}
        token={authToken}
        onLiveStreamChange={setLiveStream}
        username={authUser?.username || ''}
        liveSessions={liveSessions}
        liveStream={liveStream}
        archiveItems={resolvedArchiveItems}
        liveRequests={liveRequests}
        serviceRequests={serviceRequests}
        servicePrices={servicePrices}
        transactions={transactions}
        archiveFilters={siteData.archiveFilters}
        onLogout={handleLogout}
        onUpdateLiveStream={updateLiveStream}
        onGoLiveWebrtc={goLiveWebrtc}
        onEndLiveWebrtc={endLiveWebrtc}
        onAddLiveSession={addLiveSession}
        onUploadLiveSessionAudio={uploadLiveSessionAudio}
        onUploadLiveSessionCover={uploadLiveSessionCover}
        onUploadLiveStreamPoster={uploadLiveStreamPoster}
        onUpdateLiveSession={updateLiveSession}
        onDeleteLiveSession={deleteLiveSession}
        onReviewLiveRequest={reviewLiveRequest}
        onDeleteLiveRequest={deleteLiveRequest}
        onConvertLiveRequestToWav={convertLiveRequestToWav}
        onPublishServiceQuote={publishServiceQuote}
        onQuoteAction={quoteAction}
        confirmedBookings={confirmedBookings}
        onUpdateAdminPrice={updateAdminPrice}
        onRefreshTransactions={refreshTransactions}
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
        lang={echoLang}
          isAuthenticated={false}
          username=""
          loginError="Log in to open your dashboard."
          signupError=""
          onLogin={handleLogin}
          onSignup={handleSignup}
          onGoogleLogin={handleGoogleLogin}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <DashboardPage
        user={authUser}
        serviceRequests={serviceRequests}
        onQuoteAction={quoteAction}
        authToken={authToken}
        activeView={({ '/dashboard/services': 'services', '/dashboard/planning': 'planning', '/dashboard/payments': 'payments' })[routePath] || 'overview'}
        onLogout={handleLogout}
      />
    );
  }

  return null;

}

export default App;
