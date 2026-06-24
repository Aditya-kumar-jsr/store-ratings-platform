import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

const landingByRole: Record<Role, string> = {
  admin: '/admin',
  user: '/stores',
  owner: '/owner',
};

export default function OAuthCallback() {
  const { completeOAuth } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState(params.get('error') ?? '');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError((current) => current || 'OAuth callback did not include a token.');
      return;
    }

    completeOAuth(token)
      .then((user) => navigate(landingByRole[user.role], { replace: true }))
      .catch(() => setError('OAuth sign-in failed. Please try again.'));
  }, [completeOAuth, navigate, params]);

  if (!params.get('token') && !error) return <Navigate to="/login" replace />;

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Completing sign in</h1>
        {error ? <div className="alert error">{error}</div> : <p className="muted">Verifying your Google account…</p>}
      </div>
    </div>
  );
}
