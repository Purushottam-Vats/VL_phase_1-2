import { Loader2 } from 'lucide-react';

export default function Spinner({ label = 'Loading...', className = '' }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 py-12 text-sm text-slate-500 ${className}`}>
      <Loader2 className="animate-spin" size={18} aria-hidden="true" />
      {label}
    </div>
  );
}
