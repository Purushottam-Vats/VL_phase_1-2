import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Alert({ type = 'error', children }) {
  if (!children) return null;
  const ok = type === 'success';
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={`flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm ${ok ? 'bg-lab-50 text-lab-700' : 'bg-red-50 text-red-700'}`}
    >
      {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}
