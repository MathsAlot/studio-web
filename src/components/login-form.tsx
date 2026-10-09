'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';

import { ErrorAlert } from '@/components/error-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { login } from '@/lib/client/session';

interface LoginFormProps {
  nextPath: string;
  initialError?: string | null;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Accessible sign-in form. Preserves entered values on failure, announces
 * errors, and moves focus to the first invalid field.
 */
export function LoginForm({ nextPath, initialError = null }: LoginFormProps) {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(initialError);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (email.trim().length === 0) {
      errors.email = 'Enter your email address.';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = 'Enter a valid email address, like name@example.com.';
    }
    if (password.length === 0) {
      errors.password = 'Enter your password.';
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    const errors = validate();
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      setFormError('Check the highlighted fields and try again.');
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setFormError(null);
    setPending(true);

    const result = await login(email.trim(), password);

    if (!result.ok) {
      setFormError(result.message);
      setPending(false);
      return;
    }

    setStatusMessage('Signed in. Opening the Studio…');
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
      aria-describedby="login-help"
    >
      <p id="login-help" className="text-body text-muted-foreground">
        Sign in with your individual MathsAlot Studio account. Accounts are issued by an Admin.
      </p>

      {formError ? <ErrorAlert title="Sign-in problem">{formError}</ErrorAlert> : null}

      {statusMessage ? (
        <p role="status" aria-live="polite" className="text-body-sm text-success-foreground">
          {statusMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          spellCheck={false}
          autoCapitalize="none"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          className="h-11 md:h-8"
        />
        {fieldErrors.email ? (
          <p id="email-error" role="alert" className="text-body-sm text-danger">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          ref={passwordRef}
          id="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          className="h-11 md:h-8"
        />
        {fieldErrors.password ? (
          <p id="password-error" role="alert" className="text-body-sm text-danger">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="h-11 w-full sm:h-8 sm:w-auto"
      >
        <LogIn aria-hidden="true" />
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
