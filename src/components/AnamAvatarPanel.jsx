import { createClient } from '@anam-ai/js-sdk';
import { ExternalLink, MessageSquareText, Mic, PhoneCall, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createAnamSessionToken } from '../lib/api';

function AnamAvatarPanel() {
  const [anamError, setAnamError] = useState('');
  const [anamReady, setAnamReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef(null);
  const videoRef = useRef(null);

  async function handleStartSession() {
    if (isLoading || anamReady || !videoRef.current) {
      return;
    }

    setIsLoading(true);
    setAnamError('');

    try {
      const { sessionToken } = await createAnamSessionToken();
      const nextClient = createClient(sessionToken);

      clientRef.current = nextClient;
      await nextClient.streamToVideoElement('persona-video');
      setAnamReady(true);
    } catch (error) {
      setAnamError(error.message || 'Unable to start the Anam assistant session.');
      setAnamReady(false);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (typeof clientRef.current?.stop === 'function') {
        clientRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="dashboard-anam-embed">
      <div className="dashboard-avatar-card">
        <div className="dashboard-avatar-mark">ANAM</div>
        <p>Always available to answer questions about the session being prepared with Khalil.</p>
        <div className="dashboard-avatar-features">
          <span>
            <MessageSquareText size={15} />
            Live conversation
          </span>
          <span>
            <Mic size={15} />
            Voice enabled
          </span>
          <span>
            <Video size={15} />
            Embedded avatar
          </span>
        </div>
        <button
          type="button"
          className="primary-button dashboard-anam-call"
          onClick={handleStartSession}
          disabled={isLoading || anamReady}
        >
          <PhoneCall size={16} />
          <span>{anamReady ? 'ANAM CONNECTED' : isLoading ? 'CALLING ANAM...' : 'CALL ANAM'}</span>
        </button>
        <a className="secondary-button" href="https://lab.anam.ai/" target="_blank" rel="noreferrer">
          OPEN ANAM LAB
        </a>
      </div>

      <div className="dashboard-chat dashboard-anam-live">
        <div className="dashboard-anam-player-shell">
          <video
            id="persona-video"
            ref={videoRef}
            className="dashboard-anam-video"
            autoPlay
            muted={false}
            playsInline
          />
        </div>

        {!isLoading && !anamReady && !anamError ? (
          <div className="dashboard-card dashboard-anam-setup">
            <span className="detail-label">ANAM ON STANDBY</span>
            <p>Click the call button to create a secure session and start the live assistant.</p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="dashboard-card">
            <span className="detail-label">LOADING ANAM</span>
            <p>Creating a secure session token and connecting the live avatar.</p>
          </div>
        ) : null}

        {anamReady ? (
          <div className="dashboard-card dashboard-anam-setup">
            <span className="detail-label">ANAM CONNECTED</span>
            <p>The assistant is now streaming into this dashboard using a server-created session token.</p>
          </div>
        ) : null}

        {anamError ? (
          <div className="dashboard-card dashboard-anam-setup">
            <span className="detail-label">ANAM SESSION ERROR</span>
            <p>{anamError}</p>
            <div className="dashboard-setup-list">
              <article>
                <strong>Backend requirement</strong>
                <span>Set `ANAM_API_KEY` on the server so `/api/session-token` can mint secure session tokens.</span>
              </article>
              <article>
                <strong>Persona config</strong>
                <span>Adjust the Anam persona IDs in the backend env if you want a different avatar, voice, or LLM.</span>
              </article>
            </div>
            <a className="primary-button" href="https://lab.anam.ai/" target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              <span>OPEN ANAM LAB</span>
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AnamAvatarPanel;
