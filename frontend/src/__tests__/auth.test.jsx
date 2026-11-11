import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';
import { session } from '../services/api';
import { authService } from '../services/authService';
import { labService } from '../services/labService';

vi.mock('../services/authService', () => ({
  authService: { login: vi.fn(), register: vi.fn(), me: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn() },
}));
vi.mock('../services/labService', () => ({
  labService: { subjects: vi.fn(), assignments: vi.fn(), students: vi.fn(), experiments: vi.fn(), experiment: vi.fn() },
}));

const student = { id: 's1', name: 'Ananya R', email: 'a@example.com', role: 'student', grade: '9', section: 'A', preferredLanguage: 'en' };
const teacher = { id: 't1', name: 'Lakshmi Devi', email: 't@example.com', role: 'teacher', preferredLanguage: 'en' };

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  labService.subjects.mockResolvedValue([{ id: 'p', key: 'physics', name: 'Physics', description: 'd', icon: 'zap', color: '#2563eb', experimentCount: 3 }]);
  labService.assignments.mockResolvedValue({ assignments: [], pagination: { total: 0 } });
  labService.students.mockResolvedValue({ students: [], pagination: { total: 8 } });
});

const signInSession = (user) => {
  session.save('token-abc', user);
  authService.me.mockResolvedValue(user);
};

describe('route protection', () => {
  test('an anonymous visitor is redirected from /student to the login page', async () => {
    renderAt('/student');
    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
  });

  test('a student who opens /teacher is sent back to the student dashboard', async () => {
    signInSession(student);
    renderAt('/teacher');
    expect(await screen.findByText('Hello, Ananya')).toBeInTheDocument();
    expect(labService.students).not.toHaveBeenCalled(); // teacher-only data was never requested
  });

  test('a teacher who opens /student is sent to the teacher dashboard', async () => {
    signInSession(teacher);
    renderAt('/student');
    expect(await screen.findByText('Welcome, Lakshmi Devi')).toBeInTheDocument();
  });

  test('a stored session survives a network failure while offline (not logged out)', async () => {
    session.save('token-abc', student);
    authService.me.mockRejectedValue({ code: 'ERR_NETWORK', message: 'Network Error' }); // no response => offline
    renderAt('/student');
    expect(await screen.findByText('Hello, Ananya')).toBeInTheDocument();
    expect(session.getToken()).toBe('token-abc');
  });
});

describe('login', () => {
  test('rejects an invalid email without calling the API', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'whatever1');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('valid email');
    expect(authService.login).not.toHaveBeenCalled();
  });

  test('successful student login stores the token and opens the student dashboard', async () => {
    authService.login.mockResolvedValue({ token: 'jwt-1', user: student });
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'a@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secret123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Hello, Ananya')).toBeInTheDocument();
    expect(authService.login).toHaveBeenCalledWith({ email: 'a@example.com', password: 'Secret123' });
    expect(session.getToken()).toBe('jwt-1');
    expect(await screen.findByText('3 experiments available')).toBeInTheDocument();
  });

  test('teacher login opens the teacher dashboard with real counts', async () => {
    authService.login.mockResolvedValue({ token: 'jwt-2', user: teacher });
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 't@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secret123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Welcome, Lakshmi Devi')).toBeInTheDocument();
    expect(await screen.findByText('8')).toBeInTheDocument(); // registered students from the API
  });

  test('shows the server error message when credentials are wrong', async () => {
    authService.login.mockRejectedValue({ response: { status: 401, data: { success: false, message: 'Invalid email or password' } } });
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'a@example.com');
    await user.type(screen.getByLabelText('Password'), 'Wrong12345');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(session.getToken()).toBeNull();
  });

  test('shows a clear message when the server cannot be reached', async () => {
    authService.login.mockRejectedValue({ code: 'ERR_NETWORK', message: 'Network Error' });
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'a@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secret123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });
});

describe('registration', () => {
  test('mismatched passwords are caught on the client', async () => {
    const user = userEvent.setup();
    renderAt('/register');
    await user.type(screen.getByLabelText('Full name'), 'Ananya R');
    await user.type(screen.getByLabelText('Email'), 'a@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secret123');
    await user.type(screen.getByLabelText('Confirm password'), 'Different1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match');
    expect(authService.register).not.toHaveBeenCalled();
  });

  test('a weak password is rejected with the specific rule that failed', async () => {
    const user = userEvent.setup();
    renderAt('/register');
    await user.type(screen.getByLabelText('Full name'), 'Ananya R');
    await user.type(screen.getByLabelText('Email'), 'a@example.com');
    await user.type(screen.getByLabelText('Password'), 'onlyletters');
    await user.type(screen.getByLabelText('Confirm password'), 'onlyletters');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('at least one number');
  });

  test('a student registers and lands on the student dashboard; payload has no teacher fields', async () => {
    authService.register.mockResolvedValue({ token: 'jwt-3', user: student });
    const user = userEvent.setup();
    renderAt('/register');
    await user.type(screen.getByLabelText('Full name'), 'Ananya R');
    await user.type(screen.getByLabelText('Email'), 'a@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secret123');
    await user.type(screen.getByLabelText('Confirm password'), 'Secret123');
    await user.selectOptions(screen.getByLabelText('Class'), '9');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Hello, Ananya')).toBeInTheDocument();
    const payload = authService.register.mock.calls[0][0];
    expect(payload).toMatchObject({ role: 'student', grade: '9', preferredLanguage: 'en' });
    expect(payload.inviteCode).toBeUndefined();
    expect(payload.confirm).toBeUndefined();
  });

  test('choosing Teacher shows the invite-code field and requires it', async () => {
    const user = userEvent.setup();
    renderAt('/register');
    await user.click(screen.getByLabelText('teacher'));
    expect(screen.queryByLabelText('Class')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Full name'), 'Lakshmi Devi');
    await user.type(screen.getByLabelText('Email'), 't@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secret123');
    await user.type(screen.getByLabelText('Confirm password'), 'Secret123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('invite code');
    expect(authService.register).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  test('clears the session and returns to the login page', async () => {
    signInSession(student);
    const user = userEvent.setup();
    renderAt('/student');
    await screen.findByText('Hello, Ananya');
    await user.click(screen.getAllByRole('button', { name: /log out/i })[0]);
    await waitFor(() => expect(screen.getByText('Welcome back')).toBeInTheDocument());
    expect(session.getToken()).toBeNull();
    expect(session.getUser()).toBeNull();
  });
});
