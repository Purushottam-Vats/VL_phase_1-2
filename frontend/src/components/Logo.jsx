import { FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Logo({ to = '/', className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 font-semibold text-slate-900 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-lab-600 text-white">
        <FlaskConical size={20} aria-hidden="true" />
      </span>
      <span className="leading-tight">
        Virtual Lab
        <span className="block text-[11px] font-normal text-slate-500">for Learning Science</span>
      </span>
    </Link>
  );
}
