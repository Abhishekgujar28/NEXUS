import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError, FieldHint } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth';
import { apiErrorMessage } from '@/lib/api';

export function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const on = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created');
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Create your workspace</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Free while in preview. No credit card required.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required autoComplete="name" value={form.name} onChange={on('name')} placeholder="Ada Lovelace" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={on('email')} placeholder="you@example.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={on('password')}
            placeholder="At least 8 characters"
          />
          <FieldHint>Use a passphrase you'll remember — you can change it later.</FieldHint>
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          {loading ? 'Creating account' : 'Create account'}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground mt-6 text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-citrine-400 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
