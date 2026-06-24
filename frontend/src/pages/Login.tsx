import { apiOrigin } from '../api/client';

export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href = `${apiOrigin}/api/auth/google`;
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Sign in</h1>
        <p className="muted">Use Google OAuth to access your store ratings account.</p>
        <button className="btn btn-primary" onClick={handleGoogleLogin}>
          Continue with Google
        </button>
        <p className="muted">No passwords are stored by this application.</p>
      </div>
    </div>
  );
}
