'use client';

import { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';

import { ErrorAlert } from '@/components/error-alert';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserSummary } from '@/lib/api-client';
import { resetUserPassword } from '@/lib/client/admin';

const MIN_PASSWORD_LENGTH = 12;

type Step = 'form' | 'confirm' | 'done';

interface ResetPasswordDialogProps {
  user: UserSummary;
  onComplete: (message: string) => void;
  onError: (message: string) => void;
}

/**
 * Admin lockout recovery (D-047). The plaintext password is entered once,
 * confirmed without ever being echoed back, and sent to the API; the server
 * revokes the target's sessions and audits the action. Nothing here renders or
 * logs the password.
 */
export function ResetPasswordDialog({ user, onComplete, onError }: ResetPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revokedSessions, setRevokedSessions] = useState<number | null>(null);

  function resetState() {
    setStep('form');
    setPassword('');
    setConfirmPassword('');
    setFormError(null);
    setSubmitError(null);
    setSubmitting(false);
    setRevokedSessions(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      resetState();
    }
  }

  function handleContinue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Enter a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setFormError('The two passwords do not match.');
      return;
    }
    setFormError(null);
    setStep('confirm');
  }

  async function handleConfirm() {
    setSubmitting(true);
    setSubmitError(null);
    const result = await resetUserPassword(user.id, password);
    setSubmitting(false);
    if (!result.ok) {
      // Keep the entered password so the Admin can retry a transient failure.
      setSubmitError(result.message);
      setStep('form');
      onError(result.message);
      return;
    }
    setRevokedSessions(result.data.revokedSessions);
    setPassword('');
    setConfirmPassword('');
    setStep('done');
    onComplete(
      `Password reset for ${user.displayName}. ${result.data.revokedSessions} session(s) revoked.`,
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" data-action="reset-password">
          <KeyRound aria-hidden="true" />
          Reset password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {user.displayName}. Their active sessions are revoked and the
            action is audited. The password is never displayed again.
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <form onSubmit={handleContinue} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`reset-password-${user.id}`}>New password</Label>
              <Input
                id={`reset-password-${user.id}`}
                type="password"
                autoComplete="new-password"
                value={password}
                minLength={MIN_PASSWORD_LENGTH}
                onChange={(event) => {
                  setFormError(null);
                  setPassword(event.target.value);
                }}
                aria-invalid={formError ? true : undefined}
                aria-describedby={`reset-password-help-${user.id}`}
              />
              <p
                id={`reset-password-help-${user.id}`}
                className="text-body-sm text-muted-foreground"
              >
                At least {MIN_PASSWORD_LENGTH} characters. This value is never shown again.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`reset-password-confirm-${user.id}`}>Confirm password</Label>
              <Input
                id={`reset-password-confirm-${user.id}`}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setFormError(null);
                  setConfirmPassword(event.target.value);
                }}
                aria-invalid={formError ? true : undefined}
              />
            </div>
            {formError ? (
              <p role="alert" className="text-body-sm text-danger">
                {formError}
              </p>
            ) : null}
            {submitError ? (
              <ErrorAlert title="Password reset failed">{submitError}</ErrorAlert>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" data-action="reset-continue">
                Continue
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {step === 'confirm' ? (
          <div className="space-y-3">
            <Alert className="border-warning/30 bg-warning-subtle text-warning-foreground">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle>Confirm password reset</AlertTitle>
              <AlertDescription className="text-warning-foreground/90">
                Reset the password for <span className="font-medium">{user.displayName}</span>?
                Their current sessions will be revoked immediately. The new password is not shown
                here or anywhere after this step.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep('form')}>
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleConfirm()}
                disabled={submitting}
                aria-busy={submitting}
                data-action="reset-confirm"
              >
                {submitting ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <KeyRound aria-hidden="true" />
                )}
                Confirm reset
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === 'done' ? (
          <div className="space-y-3">
            <Alert className="border-success/30 bg-success-subtle text-success-foreground">
              <ShieldCheck aria-hidden="true" />
              <AlertTitle>Password reset</AlertTitle>
              <AlertDescription className="text-success-foreground/90">
                {user.displayName} can sign in with the new password.{' '}
                {revokedSessions !== null ? `${revokedSessions} session(s) revoked.` : null}
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
