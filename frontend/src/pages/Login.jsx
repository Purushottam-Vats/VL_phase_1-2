import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Alert from '../components/Alert';
import AuthLayout from '../layouts/AuthLayout';
import { homePathFor, useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import { EMAIL_RE } from '../utils/validation';

const DEMO = {
  student: { email: 'student1@example.com', password: 'Student@123' },
  teacher: { email: 'teacher1@example.com', password: 'Teacher@123' },
};

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homePathFor(user.role)} replace />;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(form.email.trim())) return setError('Enter a valid email address');
    if (!form.password) return setError('Enter your password');
    setBusy(true);
    try {
      const u = await login({ email: form.email.trim(), password: form.password });
      const from = location.state?.from?.pathname;
      const allowed = from && from.startsWith(homePathFor(u.role));
      navigate(allowed ? from : homePathFor(u.role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue your experiments."
      footer={<>New here? <Link to="/register" className="font-medium text-brand-600 hover:underline">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Alert>{error}</Alert>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" autoComplete="current-password" className="input" value={form.password} onChange={set('password')} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {busy ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs text-slate-500">Development only - fill in the seeded demo accounts:</p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => setForm(DEMO.student)}>Demo student</button>
            <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => setForm(DEMO.teacher)}>Demo teacher</button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
