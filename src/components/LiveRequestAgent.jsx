import { useState } from 'react';

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

function LiveRequestAgent({ onCreate, onSearchYoutubeVideos }) {
  const [requesterName, setRequesterName] = useState('');
  const [requestSource, setRequestSource] = useState('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [otherUrl, setOtherUrl] = useState('');
  const [manualSong, setManualSong] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [message, setMessage] = useState('');
  const [requestFeedback, setRequestFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [youtubeSongQuery, setYoutubeSongQuery] = useState('');
  const [youtubeArtistQuery, setYoutubeArtistQuery] = useState('');
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [isSearchingYoutube, setIsSearchingYoutube] = useState(false);
  const requestText = requestSource === 'youtube'
    ? `${message.trim() || `${youtubeSongQuery.trim()} ${youtubeArtistQuery.trim()}`.trim()} ${youtubeUrl.trim()}`.trim()
    : requestSource === 'other'
      ? otherUrl.trim()
      : `${manualSong.trim()} ${manualArtist.trim()}`.trim();
  const canSubmit = requestText.length > 0 && !isSubmitting;
  const youtubeQuery = `${youtubeSongQuery.trim()} ${youtubeArtistQuery.trim()}`.trim();
  const canSearchYoutube = youtubeQuery.length >= 2 && !isSearchingYoutube;

  const handleYoutubeSearch = async () => {
    if (!canSearchYoutube || typeof onSearchYoutubeVideos !== 'function') {
      return;
    }

    setIsSearchingYoutube(true);
    try {
      const result = await onSearchYoutubeVideos(youtubeQuery);
      setYoutubeResults(result.items || []);
      if (!result.items?.length) {
        setYoutubeResults([]);
        setRequestFeedback('No YouTube videos matched that search.');
      }
    } catch (error) {
      setYoutubeResults([]);
      setRequestFeedback(error.message || 'YouTube search is unavailable right now.');
    } finally {
      setIsSearchingYoutube(false);
    }
  };

  const handleUseYoutubeResult = (result) => {
    setYoutubeSongQuery(result.title);
    setYoutubeUrl(result.url);
    setMessage(result.title);
    setYoutubeResults([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const submittedMessage = requestText;
    setIsSubmitting(true);
    setRequestFeedback('');

    try {
      const result = await onCreate({
        requesterName: requesterName.trim() || 'Audience',
        message: submittedMessage,
      });
      setRequestFeedback(result.message || 'Request sent to Khalil for approval.');
      setMessage('');
      setYoutubeUrl('');
      setOtherUrl('');
      setManualSong('');
      setManualArtist('');
    } catch (error) {
      setRequestFeedback(error.message || 'The request could not be transmitted right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="live-request-agent">
      <div className="live-request-agent-head">
        <div>
          <p className="detail-label">AUDIENCE REQUESTS</p>
          <h5>Choose how to send your song request. It will go directly to Khalil for approval.</h5>
        </div>
        <span className="live-request-agent-status">Direct To Khalil</span>
      </div>

      <div className="live-request-agent-main">
        <form className="live-request-form" onSubmit={handleSubmit}>
          <label>
            <span>Your Name</span>
            <input
              type="text"
              value={requesterName}
              onChange={(event) => setRequesterName(event.target.value)}
              placeholder="Audience"
            />
          </label>
          <label>
            <span>Request Method</span>
            <select value={requestSource} onChange={(event) => setRequestSource(event.target.value)}>
              <option value="youtube">YouTube / link or search</option>
              <option value="other">Other / general link</option>
              <option value="manual">Manual / song and/or artist</option>
            </select>
          </label>

          {requestSource === 'youtube' ? (
            <div className="live-request-source-fields live-request-youtube-fields">
              <div className="live-request-source-grid">
                <label>
                  <span>Song Name</span>
                  <input
                    type="search"
                    value={youtubeSongQuery}
                    onChange={(event) => {
                      setYoutubeSongQuery(event.target.value);
                      setMessage('');
                    }}
                    placeholder="Song title"
                  />
                </label>
                <label>
                  <span>Artist Name</span>
                  <input
                    type="search"
                    value={youtubeArtistQuery}
                    onChange={(event) => {
                      setYoutubeArtistQuery(event.target.value);
                      setMessage('');
                    }}
                    placeholder="Artist"
                  />
                </label>
                <button type="button" className="secondary-button" onClick={handleYoutubeSearch} disabled={!canSearchYoutube}>
                  {isSearchingYoutube ? 'SEARCHING...' : 'SEARCH YOUTUBE'}
                </button>
              </div>
              <label>
                <span>YouTube Link</span>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  placeholder="Optional YouTube link"
                />
              </label>
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
            </div>
          ) : null}

          {requestSource === 'other' ? (
            <label className="live-request-source-fields">
              <span>General Link</span>
              <input
                type="url"
                value={otherUrl}
                onChange={(event) => setOtherUrl(event.target.value)}
                placeholder="Spotify, Anghami, Instagram, Facebook, TikTok..."
              />
            </label>
          ) : null}

          {requestSource === 'manual' ? (
            <div className="live-request-source-fields live-request-source-grid">
              <label>
                <span>Song Name</span>
                <input
                  type="text"
                  value={manualSong}
                  onChange={(event) => setManualSong(event.target.value)}
                  placeholder="Song title"
                />
              </label>
              <label>
                <span>Artist Name</span>
                <input
                  type="text"
                  value={manualArtist}
                  onChange={(event) => setManualArtist(event.target.value)}
                  placeholder="Artist (optional)"
                />
              </label>
            </div>
          ) : null}

          <p className="live-request-helper">Your request is sent directly as pending and reviewed by Khalil.</p>
          {requestFeedback ? <p className="live-request-helper live-request-feedback">{requestFeedback}</p> : null}
          <button type="submit" className="primary-button" disabled={!canSubmit}>
            {isSubmitting ? 'SENDING...' : 'SEND REQUEST'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LiveRequestAgent;
