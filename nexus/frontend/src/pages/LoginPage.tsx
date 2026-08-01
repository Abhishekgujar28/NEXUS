import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth';
import { apiErrorMessage } from '@/lib/api';

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const rawFrom = (location.state as { from?: { pathname?: string } })?.from?.pathname;
  const from = rawFrom && rawFrom !== '/' ? rawFrom : '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back');
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Sign in</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Continue your research where you left off.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-1.5">
            <Label htmlFor="password" className="mb-0">Password</Label>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            minLength={8}
          />
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          {loading ? 'Signing in' : 'Sign in'}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground mt-6 text-center">
        New to NEXUS?{' '}
        <Link to="/register" className="text-citrine-400 hover:underline font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}
