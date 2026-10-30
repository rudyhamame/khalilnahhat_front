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
    <>
      <div className="admin-request-section-head">
        <h3>Audience requests <span>{liveRequests.length}</span></h3>
      </div>
      {requestActionStatus ? <p className="admin-request-feedback" role="status">{requestActionStatus}</p> : null}
      {liveRequests.map((item) => {
        const requestStatus = item.requestStatus || 'pending_admin';
        return (
          <article key={item.id} className="admin-request-card">
            <header>
              <strong>{item.track || 'Track pending'}</strong>
              <span>{item.aiSummary || item.message || 'Analysis pending'}</span>
            </header>
            <p><span>Artist:</span><b>{item.artist || 'Artist pending'}</b></p>
            <p><span>Requested by:</span><b>{item.requesterName || 'Audience'}</b></p>
            <p><span>Source:</span><b>
              <span className={`admin-request-badge admin-request-badge-${requestStatus}`}>{item.sourcePlatform || 'manual'}</span>
              {item.sourceUrl ? <a className="admin-request-link" href={item.sourceUrl} target="_blank" rel="noreferrer">Open link</a> : null}
            </b></p>
            <p><span>Queue fit:</span><b>{item.suggestedInsertLabel || 'Queue suggestion pending'}</b></p>
            <p><span>Status:</span><b><span className={`admin-request-status admin-request-status-${requestStatus}`}>{requestStatus.replaceAll('_', ' ')}</span></b></p>
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
          </article>
        );
      })}
    </>
  );
}

export default AdminAudienceRequestsPanel;
