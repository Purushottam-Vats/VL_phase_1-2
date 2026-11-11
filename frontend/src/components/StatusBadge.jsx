const STYLES = {
  assigned: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-amber-50 text-amber-700',
  submitted: 'bg-brand-50 text-brand-700',
  reviewed: 'bg-lab-50 text-lab-700',
  overdue: 'bg-red-50 text-red-700',
};
const LABELS = { assigned: 'Assigned', in_progress: 'In progress', submitted: 'Submitted', reviewed: 'Reviewed', overdue: 'Overdue' };

export default function StatusBadge({ status, overdue }) {
  const key = overdue ? 'overdue' : status;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[key]}`}>{LABELS[key]}</span>;
}
