import { useEffect, useState } from 'react';
import { ClipboardList, FlaskConical, Leaf, Zap } from 'lucide-react';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import { labService } from '../services/labService';
import { formatDate } from '../utils/validation';

const ICONS = { zap: Zap, 'flask-conical': FlaskConical, leaf: Leaf };

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ subjects: [], assignments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([labService.subjects(user.preferredLanguage), labService.assignments({ limit: 50, lang: user.preferredLanguage })])
      .then(([subjects, a]) => alive && setData({ subjects, assignments: a.assignments }))
      .catch((err) => alive && setError(getErrorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [user.preferredLanguage]);

  const pending = data.assignments.filter((a) => ['assigned', 'in_progress'].includes(a.status)).length;
  const total = data.subjects.reduce((n, s) => n + s.experimentCount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Hello, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {user.grade ? `Class ${user.grade}${user.section || ''}` : 'Student'}{user.school ? ` - ${user.school}` : ''}
        </p>
      </div>

      <Alert>{error}</Alert>
      {loading ? <Spinner /> : (
        <>
          <section aria-labelledby="subjects-h">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="subjects-h" className="font-semibold text-slate-900">Subjects</h2>
              <p className="text-sm text-slate-500">{total} experiments available</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {data.subjects.map((s) => {
                const Icon = ICONS[s.icon] || FlaskConical;
                return (
                  <div key={s.id} className="card p-5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: s.color }}><Icon size={20} aria-hidden="true" /></span>
                    <h3 className="mt-4 font-semibold text-slate-900">{s.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{s.description}</p>
                    <p className="mt-3 text-xs font-medium text-slate-500">{s.experimentCount} experiments</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="assign-h">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="assign-h" className="font-semibold text-slate-900">My assignments</h2>
              <p className="text-sm text-slate-500">{pending} pending</p>
            </div>
            {data.assignments.length === 0 ? (
              <div className="card flex items-center gap-3 p-6 text-sm text-slate-500">
                <ClipboardList size={20} aria-hidden="true" /> Nothing assigned yet. Your teacher's assignments will appear here.
              </div>
            ) : (
              <ul className="card divide-y divide-slate-100">
                {data.assignments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{a.experiment?.title}</p>
                      <p className="text-xs text-slate-500">{a.subject?.name} - from {a.teacher?.name} - due {formatDate(a.dueDate)}</p>
                    </div>
                    <StatusBadge status={a.status} overdue={a.isOverdue} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
