import { Trash2 } from 'lucide-react';

function AdminAudienceRequestsPanel({
  liveRequests,
  requestActionStatus,
  deletingRequestId,
  convertingRequestId,
  onDeleteRequest,
  onConvertRequest,
  onReviewRequest,
}) {
  return (
    <div className="admin-request-section admin-live-request-section">
      <div className="admin-request-section-head">
        <p className="detail-label">AUDIENCE REQUESTS</p>
        <span>{`${liveRequests.length} ITEMS`}</span>
      </div>
      {requestActionStatus ? <p className="admin-request-feedback" role="status">{requestActionStatus}</p> : null}
      <div className="admin-request-table-shell">
        <table className="admin-request-action-status">
          <thead>
            <tr>
              <th scope="col">Song</th>
              <th scope="col">Artist</th>
              <th scope="col">Requested By</th>
              <th scope="col">Source</th>
              <th scope="col">Queue Fit</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {liveRequests.length ? liveRequests.map((item) => {
              const requestStatus = item.requestStatus || 'pending_admin';
              return (
                <tr key={item.id}>
                  <th scope="row">
                    <strong>{item.track || 'Track pending'}</strong>
                    <span>{item.aiSummary || item.message || 'Analysis pending'}</span>
                  </th>
                  <td>{item.artist || 'Artist pending'}</td>
                  <td>{item.requesterName || 'Audience'}</td>
                  <td>
                    <span className={`admin-request-badge admin-request-badge-${requestStatus}`}>
                      {item.sourcePlatform || 'manual'}
                    </span>
                    {item.sourceUrl ? <a className="admin-request-link" href={item.sourceUrl} target="_blank" rel="noreferrer">Open link</a> : null}
                  </td>
                  <td>{item.suggestedInsertLabel || 'Queue suggestion pending'}</td>
                  <td><span className={`admin-request-status admin-request-status-${requestStatus}`}>{requestStatus.replaceAll('_', ' ')}</span></td>
                  <td>
                    <div className="admin-request-actions admin-request-table-actions">
                      {item.sourcePlatform === 'youtube' && item.sourceUrl ? (
                        <button type="button" className="secondary-button admin-request-convert-button" onClick={() => onConvertRequest(item)} disabled={convertingRequestId === item.id || Boolean(item.audioUrl)}>
                          {convertingRequestId === item.id ? 'CONVERTING...' : item.audioUrl ? 'WAV READY' : 'CONVERT WAV'}
                        </button>
                      ) : null}
                      {requestStatus === 'pending_admin' ? (
                        <>
                          <button type="button" className="primary-button" onClick={() => onReviewRequest(item.id, { decision: 'approved' })}>APPROVE</button>
                          <button type="button" className="secondary-button" onClick={() => onReviewRequest(item.id, { decision: 'rejected' })}>REJECT</button>
                        </>
                      ) : null}
                      <button type="button" className="admin-request-delete-button" onClick={() => onDeleteRequest(item)} disabled={deletingRequestId === item.id} aria-label={`Delete request for ${item.track}`} title="Delete request">
                        <Trash2 size={15} aria-hidden="true" />
                        <span className="sr-only">{deletingRequestId === item.id ? 'Deleting request' : 'Delete request'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan="7" className="admin-request-table-empty">No audience requests have been transmitted yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminAudienceRequestsPanel;
