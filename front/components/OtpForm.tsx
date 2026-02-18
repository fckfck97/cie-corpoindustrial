'use client';

/**
 * OTP Form Component
 * Phone/Email input with OTP code verification
 */

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';

interface OtpFormProps {
  onSuccess: () => void;
}

export function OtpForm({ onSuccess }: OtpFormProps) {
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(0);

  const handleRequestOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      try {
        if (!contact.includes('@')) {
          throw new Error('Ingresa un correo electrónico válido.');
        }

        await requestOtp({ email: contact.trim().toLowerCase() });

        setStep('verify');
        setResendTimer(60);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No fue posible solicitar el OTP');
      } finally {
        setLoading(false);
      }
    },
    [contact, requestOtp]
  );

  const handleResendOtp = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await requestOtp({ email: contact.trim().toLowerCase() });
      setResendTimer(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible reenviar el OTP');
    } finally {
      setLoading(false);
    }
  }, [contact, requestOtp]);

  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      try {
        await verifyOtp({
          identifier: contact.trim().toLowerCase(),
          otp,
          source: 'web',
        });

        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falló la verificación');
      } finally {
        setLoading(false);
      }
    },
    [contact, otp, onSuccess, verifyOtp]
  );

  // Countdown para reenvío (segundos)
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  if (step === 'input') {
    return (
      <div className="space-y-6">
        <form onSubmit={handleRequestOtp} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Correo electrónico</label>
            <Input
              type="email"
              placeholder="tu@correo.com"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={loading}
              required
              className="h-11 rounded-lg border-input bg-input text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Button 
            type="submit" 
            className="h-11 w-full rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90" 
            disabled={loading || !contact}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Enviando...
              </span>
            ) : (
              'Enviar código'
            )}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur p-4">
        <p className="text-sm text-muted-foreground">
          Código enviado a <span className="font-medium text-foreground">{contact}</span>
        </p>
      </div>

      <form onSubmit={handleVerifyOtp} className="space-y-4">
        {error && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}



        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Código de verificación</label>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-12 w-12 text-lg font-semibold border-input" />
                <InputOTPSlot index={1} className="h-12 w-12 text-lg font-semibold border-input" />
                <InputOTPSlot index={2} className="h-12 w-12 text-lg font-semibold border-input" />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} className="h-12 w-12 text-lg font-semibold border-input" />
                <InputOTPSlot index={4} className="h-12 w-12 text-lg font-semibold border-input" />
                <InputOTPSlot index={5} className="h-12 w-12 text-lg font-semibold border-input" />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-lg border-border text-foreground hover:bg-secondary"
            onClick={() => {
              setStep('input');
              setOtp('');
              setError(null);
            }}
            disabled={loading}
          >
            Atrás
          </Button>
          <Button 
            type="submit" 
            className="h-11 flex-1 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90" 
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Verificando...
              </span>
            ) : (
              'Verificar'
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          ¿No recibiste el código?{' '}
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={loading || resendTimer > 0}
            className={`font-medium transition-colors ${resendTimer > 0 ? 'text-muted-foreground/70 cursor-not-allowed' : 'text-primary hover:text-secondary underline'}`}
          >
            {resendTimer > 0 ? `Reenviar en ${resendTimer}s` : 'Solicitar de nuevo'}
          </button>
        </p>
      </form>
    </div>
  );
}
