import { dashboardStats } from '../../localStore';

export default function AdminDashboard() {
  const stats = dashboardStats();

  return (
    <div className="page">
      <h1>Admin dashboard</h1>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{stats?.totalUsers ?? '—'}</span>
          <span className="stat-label">Total users</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.totalStores ?? '—'}</span>
          <span className="stat-label">Total stores</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.totalRatings ?? '—'}</span>
          <span className="stat-label">Total ratings</span>
        </div>
      </div>
    </div>
  );
}
