import { useMemo, useState } from 'react';

function formatAmount(amountCents, currency) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency || 'CAD',
  }).format(Number(amountCents || 0) / 100);
}

function formatDate(value) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function AdminTransactionsPanel({ transactions, onRefresh }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState('');
  const totalPaid = useMemo(
    () => transactions
      .filter((transaction) => transaction.paymentStatus === 'paid')
      .reduce((total, transaction) => total + Number(transaction.amountTotal || 0), 0),
    [transactions],
  );

  const refresh = async () => {
    setIsRefreshing(true);
    setStatus('');
    try {
      await onRefresh();
      setStatus('Transactions refreshed.');
    } catch (error) {
      setStatus(error.message || 'Transactions could not be loaded.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <section id="admin-transactions" className="admin-panel admin-transactions-panel">
      <div className="section-label admin-panel-head">
        <div className="admin-panel-head-copy">
          <p className="section-number">
            <span className="section-number-mark">KN//</span>
            <span className="section-number-value">05</span>
          </p>
          <h2>TRANSACTIONS</h2>
        </div>
        <button type="button" className="secondary-button" onClick={refresh} disabled={isRefreshing}>
          {isRefreshing ? 'REFRESHING...' : 'REFRESH STRIPE'}
        </button>
      </div>

      <div className="admin-transactions-shell">
        <div className="admin-transactions-summary">
          <div>
            <span>Transactions</span>
            <strong>{transactions.length}</strong>
          </div>
          <div>
            <span>Paid total</span>
            <strong>{formatAmount(totalPaid, transactions[0]?.currency || 'CAD')}</strong>
          </div>
          <p>All Stripe Checkout payments are shown here, including future DJ, sound, lighting, video, effects, and live song-request services.</p>
        </div>

        <div className="admin-transactions-table-wrap">
          <table className="admin-transactions-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Requests / Codes</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <th scope="row">
                    <strong>{transaction.serviceName}</strong>
                    <small>{transaction.id}</small>
                  </th>
                  <td>{transaction.customerEmail || 'Email unavailable'}</td>
                  <td>{formatAmount(transaction.amountTotal, transaction.currency)}</td>
                  <td>
                    <span className={`admin-transaction-status is-${transaction.paymentStatus}`}>
                      {transaction.paymentStatus}
                    </span>
                    <small>{transaction.status}</small>
                  </td>
                  <td>
                    {transaction.requestCount ? (
                      <div className="admin-transaction-request-list">
                        <span>{`${transaction.requestCount} request${transaction.requestCount === 1 ? '' : 's'}`}</span>
                        {transaction.confirmationCodes?.length ? <small>{transaction.confirmationCodes.join(' / ')}</small> : null}
                      </div>
                    ) : (
                      <span>Service payment</span>
                    )}
                  </td>
                  <td>{formatDate(transaction.createdAt)}</td>
                </tr>
              ))}
              {!transactions.length ? (
                <tr>
                  <td colSpan="6" className="admin-transactions-empty">No Stripe transactions found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {status ? <p className="admin-transactions-status" role="status">{status}</p> : null}
      </div>
    </section>
  );
}

export default AdminTransactionsPanel;
