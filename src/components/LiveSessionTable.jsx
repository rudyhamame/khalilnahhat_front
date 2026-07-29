function LiveSessionTable({ sessions }) {
  return (
    <div className="live-session-panel">
      <div className="live-session-panel-head">
        <p className="detail-label">LIVE SESSION LIST</p>
        <span>{`${sessions.length} ITEMS`}</span>
      </div>

      <div className="live-session-table" role="table" aria-label="Live session tracks">
        <div className="live-session-row live-session-row-head" role="row">
          <span role="columnheader">Song / Music</span>
          <span role="columnheader">Duration</span>
          <span role="columnheader">Genre</span>
          <span role="columnheader">Language</span>
        </div>

        {sessions.map((session) => (
          <div key={session.id} className="live-session-row" role="row">
            <strong role="cell">{session.track}</strong>
            <span role="cell">{session.duration}</span>
            <span role="cell">{session.genre}</span>
            <span role="cell">{session.language}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LiveSessionTable;
