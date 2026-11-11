import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Alert from '../components/Alert';
import AuthLayout from '../layouts/AuthLayout';
import { homePathFor, useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import { EMAIL_RE, passwordProblem } from '../utils/validation';

const GRADES = ['6', '7', '8', '9', '10', '11', '12'];
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
];

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    role: 'student', name: '', email: '', password: '', confirm: '',
    school: '', grade: '', section: '', preferredLanguage: 'en', inviteCode: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homePathFor(user.role)} replace />;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const isTeacher = form.role === 'teacher';

  const validate = () => {
    if (form.name.trim().length < 2) return 'Enter your full name';
    if (!EMAIL_RE.test(form.email.trim())) return 'Enter a valid email address';
    const pw = passwordProblem(form.password);
    if (pw) return pw;
    if (form.password !== form.confirm) return 'Passwords do not match';
    if (isTeacher && !form.inviteCode.trim()) return 'Enter the teacher invite code given by your school';
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const problem = validate();
    if (problem) return setError(problem);

    const payload = {
      role: form.role,
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      preferredLanguage: form.preferredLanguage,
    };
    if (form.school.trim()) payload.school = form.school.trim();
    if (!isTeacher && form.grade) payload.grade = form.grade;
    if (!isTeacher && form.section.trim()) payload.section = form.section.trim();
    if (isTeacher) payload.inviteCode = form.inviteCode.trim();

    setBusy(true);
    try {
      const u = await register(payload);
      navigate(homePathFor(u.role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Students and teachers each get their own dashboard."
      footer={<>Already registered? <Link to="/login" className="font-medium text-brand-600 hover:underline">Log in</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Alert>{error}</Alert>

        <fieldset>
          <legend className="label">I am a</legend>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {['student', 'teacher'].map((r) => (
              <label key={r} className={`cursor-pointer rounded-lg py-2 text-center text-sm font-medium capitalize transition ${form.role === r ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'}`}>
                <input type="radio" name="role" value={r} checked={form.role === r} onChange={set('role')} className="sr-only" />
                {r}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" className="input" autoComplete="name" value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" className="input" autoComplete="email" value={form.email} onChange={set('email')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" type="password" className="input" autoComplete="new-password" value={form.password} onChange={set('password')} />
          </div>
          <div>
            <label htmlFor="confirm" className="label">Confirm password</label>
            <input id="confirm" type="password" className="input" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate-500">At least 8 characters, with a letter and a number.</p>

        <div>
          <label htmlFor="school" className="label">School <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="school" className="input" value={form.school} onChange={set('school')} />
        </div>

        {!isTeacher && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="grade" className="label">Class</label>
              <select id="grade" className="input" value={form.grade} onChange={set('grade')}>
                <option value="">Select</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="section" className="label">Section</label>
              <input id="section" className="input" maxLength={5} placeholder="A" value={form.section} onChange={set('section')} />
            </div>
          </div>
        )}

        {isTeacher && (
          <div>
            <label htmlFor="inviteCode" className="label">Teacher invite code</label>
            <input id="inviteCode" className="input" autoComplete="off" value={form.inviteCode} onChange={set('inviteCode')} />
            <p className="mt-1 text-xs text-slate-500">Teacher accounts need a code from your school administrator.</p>
          </div>
        )}

        <div>
          <label htmlFor="lang" className="label">Preferred language</label>
          <select id="lang" className="input" value={form.preferredLanguage} onChange={set('preferredLanguage')}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {busy ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
