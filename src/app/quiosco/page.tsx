"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { marcarAsistencia } from "@/actions/asistencia.actions";
import { Clock, LogIn, LogOut, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type MarcajeResult = {
  tipo: string;
  empleadoNombre: string;
  hora: string;
};

export default function QuioscoPage() {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    data?: MarcajeResult;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (result) {
      const timeout = setTimeout(() => {
        setResult(null);
        setPin("");
        inputRef.current?.focus();
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [result]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (pin.length !== 6 || isLoading) return;

      setIsLoading(true);
      try {
        const response = await marcarAsistencia({ pin });
        setResult({
          success: response.success,
          message: response.message,
          data: response.data as MarcajeResult | undefined,
        });
        if (response.success) setPin("");
      } catch {
        setResult({
          success: false,
          message: "Error de conexión",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [pin, isLoading],
  );

  const handleDigitPress = (digit: string) => {
    if (pin.length < 6 && !isLoading) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 6) {
        setTimeout(() => {
          marcarAsistencia({ pin: newPin }).then((response) => {
            setResult({
              success: response.success,
              message: response.message,
              data: response.data as MarcajeResult | undefined,
            });
            if (response.success) setPin("");
            setIsLoading(false);
          });
          setIsLoading(true);
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col items-center justify-center p-6 select-none">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-primary mb-2">
            Jivis
          </h1>
          <p className="text-muted-foreground text-lg">Registro de asistencia</p>
        </div>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 text-5xl font-mono font-semibold tabular-nums">
            <Clock className="size-8 text-muted-foreground" />
            {currentTime.toLocaleTimeString("es-CR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
          <p className="text-muted-foreground mt-2">
            {currentTime.toLocaleDateString("es-CR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-6">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setPin(val);
            }}
            className="sr-only"
            autoFocus
          />

          <div className="flex justify-center gap-3 mb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`size-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
                  i < pin.length
                    ? "border-primary bg-primary/10 text-primary scale-110"
                    : "border-muted-foreground/20 bg-muted/50"
                }`}
              >
                {i < pin.length ? "●" : ""}
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Ingresá tu PIN de 6 dígitos
          </p>
        </form>

        {result && (
          <div
            className={`mb-6 p-4 rounded-xl text-center transition-all duration-300 ${
              result.success
                ? "bg-emerald-500/10 border border-emerald-500/30"
                : "bg-destructive/10 border border-destructive/30"
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              {result.success ? (
                <CheckCircle2 className="size-6 text-emerald-500" />
              ) : (
                <XCircle className="size-6 text-destructive" />
              )}
              <span
                className={`text-lg font-semibold ${
                  result.success ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {result.success ? "Registrado" : "Error"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{result.message}</p>
            {result.data && result.success && (
              <div className="mt-2 flex items-center justify-center gap-2">
                {result.data.tipo === "entrada" ? (
                  <LogIn className="size-4 text-emerald-500" />
                ) : (
                  <LogOut className="size-4 text-blue-500" />
                )}
                <span className="text-sm font-medium">
                  {result.data.hora}
                </span>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="mb-6 flex justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(String(digit))}
              disabled={isLoading}
              className="h-16 rounded-xl text-2xl font-semibold bg-card border border-border hover:bg-accent active:scale-95 transition-all duration-150 disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="h-16 rounded-xl text-lg font-medium bg-card border border-border hover:bg-accent active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => handleDigitPress("0")}
            disabled={isLoading}
            className="h-16 rounded-xl text-2xl font-semibold bg-card border border-border hover:bg-accent active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={isLoading}
            className="h-16 rounded-xl text-lg font-medium bg-card border border-border hover:bg-accent active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            C
          </button>
        </div>
      </div>
    </div>
  );
}
