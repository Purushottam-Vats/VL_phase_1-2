import { Bot, FileText, Languages, Leaf, Sprout, Users, WifiOff, Zap, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { homePathFor, useAuth } from '../context/AuthContext';

const SUBJECTS = [
  { icon: Zap, name: 'Physics', text: "Ohm's law, the pendulum, reflection of light", color: 'text-brand-600 bg-brand-50' },
  { icon: FlaskConical, name: 'Chemistry', text: 'Indicators, the pH scale, separating mixtures', color: 'text-lab-600 bg-lab-50' },
  { icon: Leaf, name: 'Biology', text: 'The plant cell, digestion, photosynthesis', color: 'text-green-600 bg-green-50' },
];

const FEATURES = [
  { icon: WifiOff, title: 'Works without internet', text: 'Core experiments are stored on the device and sync when the network returns.' },
  { icon: Languages, title: 'English, Kannada and Hindi', text: 'Instructions and explanations in the language you think in, with voice read-aloud.' },
  { icon: Bot, title: 'A tutor beside you', text: 'Ask why a reading changed and get a hint tied to the experiment you are running.' },
  { icon: FileText, title: 'Your practical record, done', text: 'Observations, calculations and conclusions are organised and exported as a PDF.' },
  { icon: Users, title: 'Teachers stay in the loop', text: 'Assign experiments, see who has finished, and leave feedback on records.' },
  { icon: Sprout, title: 'Science from the farm', text: 'Examples from irrigation, soil and crops connect each experiment to village life.' },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link to={homePathFor(user.role)} className="btn-primary">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">Log in</Link>
              <Link to="/register" className="btn-primary">Create account</Link>
            </>
          )}
        </nav>
      </header>

      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            A full science lab for every school, even the ones without one.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Perform Physics, Chemistry and Biology experiments on any basic computer, switch between English, Kannada and
            Hindi, and keep your practical record without the paperwork.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary !px-5 !py-3">Start experimenting</Link>
            <Link to="/login" className="btn-secondary !px-5 !py-3">I already have an account</Link>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {SUBJECTS.map(({ icon: Icon, name, text, color }) => (
              <div key={name} className="card p-5">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={20} aria-hidden="true" /></span>
                <h2 className="mt-4 font-semibold text-slate-900">{name}</h2>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold text-slate-900">Built for classrooms with limited resources</h2>
        <div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3">
              <Icon className="mt-1 shrink-0 text-lab-600" size={20} aria-hidden="true" />
              <div>
                <h3 className="font-medium text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-500">
        RNS Institute of Technology - Community Project (1BCP308), Department of CSE (AI&amp;ML)
      </footer>
    </div>
  );
}
