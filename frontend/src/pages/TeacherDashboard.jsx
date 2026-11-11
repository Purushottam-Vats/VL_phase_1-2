import { useEffect, useState } from 'react';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import { labService } from '../services/labService';
import { formatDate } from '../utils/validation';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ students: 0, assignments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([labService.students({ limit: 1 }), labService.assignments({ limit: 100 })])
      .then(([s, a]) => alive && setData({ students: s.pagination.total, assignments: a.assignments }))
      .catch((err) => alive && setError(getErrorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const count = (...statuses) => data.assignments.filter((a) => statuses.includes(a.status)).length;
  const stats = [
    { label: 'Registered students', value: data.students },
    { label: 'Assignments given', value: data.assignments.length },
    { label: 'Awaiting review', value: count('submitted') },
    { label: 'Reviewed', value: count('reviewed') },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{user.school || 'Teacher'}</p>
      </div>

      <Alert>{error}</Alert>
      {loading ? <Spinner /> : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Summary">
            {stats.map((s) => (
              <div key={s.label} className="card p-5">
                <p className="text-3xl font-semibold text-slate-900">{s.value}</p>
                <p className="mt-1 text-sm text-slate-500">{s.label}</p>
              </div>
            ))}
          </section>

          <section aria-labelledby="recent-h">
            <h2 id="recent-h" className="mb-3 font-semibold text-slate-900">Assignments</h2>
            {data.assignments.length === 0 ? (
              <div className="card p-6 text-sm text-slate-500">You have not assigned any experiments yet.</div>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Student</th>
                      <th scope="col" className="px-5 py-3 font-medium">Experiment</th>
                      <th scope="col" className="px-5 py-3 font-medium">Due</th>
                      <th scope="col" className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{a.student?.name}</p>
                          <p className="text-xs text-slate-500">{a.student?.grade ? `Class ${a.student.grade}${a.student.section || ''}` : ''}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-700">{a.experiment?.title}</td>
                        <td className="px-5 py-3 text-slate-700">{formatDate(a.dueDate)}</td>
                        <td className="px-5 py-3"><StatusBadge status={a.status} overdue={a.isOverdue} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
