import { useMemo, useState } from 'react';

function createInitialMessages() {
  return [
    {
      id: 'agent-welcome',
      role: 'assistant',
      text:
        'Send a song name or a music link from YouTube, Anghami, Spotify, Instagram, Facebook, or TikTok. I will read the live event queue, extract the request metadata, and prepare it for Khalil to approve.',
    },
  ];
}

function formatYoutubeDuration(value) {
  const match = String(value || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    return 'Duration pending';
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function LiveRequestAgent({ onAnalyze, onCreate, onSearchYoutubeVideos }) {
  const [requesterName, setRequesterName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(createInitialMessages);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [youtubeQuery, setYoutubeQuery] = useState('');
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [isSearchingYoutube, setIsSearchingYoutube] = useState(false);
  const canSubmit = message.trim().length > 0 && !isAnalyzing;
  const canConfirm = Boolean(analysis?.metadata?.track) && !analysis?.duplicateTrack && !isSubmitting;
  const canSearchYoutube = youtubeQuery.trim().length >= 2 && !isSearchingYoutube;

  const helperCopy = useMemo(() => {
    if (!analysis) {
      return 'The agent only reads the live page queue and request metadata for this event.';
    }

    return analysis.aiSummary;
  }, [analysis]);

  const handleAnalyze = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: message.trim(),
      },
    ]);

    try {
      const result = await onAnalyze({
        requesterName: requesterName.trim() || 'Audience',
        message: message.trim(),
      });

      setAnalysis(result.analysis);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: result.analysis.aiSummary,
        },
      ]);
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: error.message || 'I could not read that request yet. Try adding the song name with the link.',
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleYoutubeSearch = async (event) => {
    event.preventDefault();

    if (!canSearchYoutube || typeof onSearchYoutubeVideos !== 'function') {
      return;
    }

    setIsSearchingYoutube(true);
    try {
      const result = await onSearchYoutubeVideos(youtubeQuery.trim());
      setYoutubeResults(result.items || []);
      if (!result.items?.length) {
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: `youtube-empty-${Date.now()}`,
            role: 'assistant',
            text: 'No YouTube videos matched that search. Try the song title and artist together.',
          },
        ]);
      }
    } catch (error) {
      setYoutubeResults([]);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `youtube-error-${Date.now()}`,
          role: 'assistant',
          text: error.message || 'YouTube search is unavailable right now.',
        },
      ]);
    } finally {
      setIsSearchingYoutube(false);
    }
  };

  const handleUseYoutubeResult = (result) => {
    setMessage(`${result.title} ${result.url}`);
    setYoutubeResults([]);
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `youtube-selected-${Date.now()}`,
        role: 'assistant',
        text: `Selected “${result.title}”. Review it below, then analyze the request.`,
      },
    ]);
  };

  const handleConfirm = async () => {
    if (!analysis?.metadata?.track || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onCreate({
        requesterName: requesterName.trim() || 'Audience',
        message: message.trim(),
        metadata: analysis.metadata,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-sent-${Date.now()}`,
          role: 'assistant',
          text: result.message || 'Your request is now waiting for Khalil to approve it.',
        },
      ]);
      setAnalysis(null);
      setMessage('');
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-submit-error-${Date.now()}`,
          role: 'assistant',
          text: error.message || 'The request could not be transmitted right now.',
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="live-request-agent">
      <div className="live-request-agent-head">
        <div>
          <p className="detail-label">AI REQUEST AGENT</p>
          <h3>Send A Song Request</h3>
        </div>
        <span className="live-request-agent-status">Queue Aware</span>
      </div>

      <form className="live-request-youtube-search" onSubmit={handleYoutubeSearch}>
        <label>
          <span>Find On YouTube</span>
          <input
            type="search"
            value={youtubeQuery}
            onChange={(event) => setYoutubeQuery(event.target.value)}
            placeholder="Song title + artist"
          />
        </label>
        <button type="submit" className="secondary-button" disabled={!canSearchYoutube}>
          {isSearchingYoutube ? 'SEARCHING...' : 'SEARCH'}
        </button>
      </form>

      {youtubeResults.length ? (
        <div className="live-request-youtube-results" aria-label="YouTube search results">
          {youtubeResults.map((result) => (
            <article className="live-request-youtube-result" key={result.id}>
              <img src={result.thumbnail} alt="" loading="lazy" />
              <div>
                <strong>{result.title}</strong>
                <span>{`${result.channelTitle} / ${formatYoutubeDuration(result.duration)}`}</span>
              </div>
              <button type="button" className="primary-button" onClick={() => handleUseYoutubeResult(result)}>
                USE SONG
              </button>
            </article>
          ))}
        </div>
      ) : null}

      <div className="live-request-chat-log" aria-live="polite">
        {messages.map((entry) => (
          <article
            key={entry.id}
            className={`live-request-message live-request-message-${entry.role}`}
          >
            <span className="live-request-role">
              {entry.role === 'assistant' ? 'Agent' : 'Audience'}
            </span>
            <p>{entry.text}</p>
          </article>
        ))}
      </div>

      {analysis ? (
        <div className="live-request-analysis">
          <div className="live-request-analysis-head">
            <strong>{analysis.metadata.track}</strong>
            <span>{analysis.metadata.artist || analysis.metadata.sourcePlatform || 'metadata ready'}</span>
          </div>
          <div className="live-request-analysis-meta">
            <span>{analysis.metadata.genres || analysis.metadata.genre || 'Genres pending'}</span>
            <span>{analysis.metadata.subgenres || 'Subgenres pending'}</span>
            <span>{analysis.metadata.sourcePlatform || 'Manual request'}</span>
          </div>
          <div className="live-request-analysis-meta">
            <span>{analysis.metadata.musicMoods || analysis.metadata.mood || 'Music moods pending'}</span>
            <span>{analysis.metadata.instruments || 'Instruments pending'}</span>
            <span>{analysis.metadata.bpm || analysis.metadata.beat ? `BPM ${analysis.metadata.bpm || analysis.metadata.beat}` : 'BPM pending'}</span>
          </div>
          <div className="live-request-analysis-meta">
            <span>{analysis.metadata.musicalKey ? `Key ${analysis.metadata.musicalKey}` : 'Key pending'}</span>
            <span>{analysis.metadata.vocals || 'Vocals pending'}</span>
            <span>{analysis.metadata.analysisSources?.join(' + ') || 'Single-source analysis'}</span>
          </div>
          <p>{analysis.suggestedInsertLabel || analysis.aiSummary}</p>
          <div className="live-request-analysis-meta">
            <span>{analysis.metadata.lyricsMoods || 'Lyrics moods pending'}</span>
            <span>{analysis.metadata.lyricsLanguage || analysis.metadata.language || 'Lyrics language pending'}</span>
            <span>{analysis.metadata.lyricsEnergy || 'Lyrics energy pending'}</span>
          </div>
          <div className="live-request-analysis-meta">
            <span>{analysis.metadata.explicit ? `Explicit ${analysis.metadata.explicit}` : 'Explicit pending'}</span>
            <span>{analysis.metadata.themes || 'Themes pending'}</span>
            <span>{analysis.metadata.analysisSources?.join(' + ') || 'Single-source analysis'}</span>
          </div>
          {analysis.metadata.lyricsSummary ? <p>{analysis.metadata.lyricsSummary}</p> : null}
          {analysis.duplicateTrack ? (
            <p className="live-request-analysis-warning">
              This request matches {analysis.duplicateTrack} already in the live event list.
            </p>
          ) : null}
          <button type="button" className="primary-button" onClick={handleConfirm} disabled={!canConfirm}>
            {isSubmitting ? 'SENDING...' : 'CONFIRM REQUEST'}
          </button>
        </div>
      ) : null}

      <form className="live-request-form" onSubmit={handleAnalyze}>
        <label>
          <span>Your Name</span>
          <input
            type="text"
            value={requesterName}
            onChange={(event) => setRequesterName(event.target.value)}
            placeholder="Audience"
          />
        </label>
        <label className="live-request-form-span">
          <span>Song Name Or Link</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Paste a song title or link from YouTube, Anghami, Spotify, Instagram, Facebook, or TikTok."
            rows={3}
          />
        </label>
        <p className="live-request-helper">{helperCopy}</p>
        <button type="submit" className="secondary-button" disabled={!canSubmit}>
          {isAnalyzing ? 'ANALYZING...' : 'ANALYZE REQUEST'}
        </button>
      </form>
    </div>
  );
}

export default LiveRequestAgent;
