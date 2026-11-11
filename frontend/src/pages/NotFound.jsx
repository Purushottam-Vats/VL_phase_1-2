import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-5xl font-semibold text-brand-600">404</p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">This page is not in the lab</h1>
        <p className="mt-1 text-sm text-slate-500">The page you are looking for does not exist or has moved.</p>
        <Link to="/" className="btn-primary mt-6">Back to home</Link>
      </div>
    </div>
  );
}
