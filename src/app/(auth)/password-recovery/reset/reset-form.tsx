"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import AuthImage from "@/app/assets/urban-scene.png";
import { ArrowLeftIcon, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { ResetPasswordData, ResetPasswordSchema } from "@/lib/validations/auth";
import { resetPassword } from "@/actions/auth.actions";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function ResetFormInner({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<ResetPasswordData>({
    resolver: valibotResolver(ResetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
      token: token ?? "",
    },
  });

  if (error === "INVALID_TOKEN" || !token) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-6 md:p-8">
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold text-destructive">Enlace inválido</h1>
                  <p className="text-muted-foreground text-balance">
                    El enlace de recuperación expiró o es inválido. Solicitá uno nuevo.
                  </p>
                </div>
                <Field>
                  <Button onClick={() => router.push("/password-recovery")}>
                    Solicitar nuevo enlace
                  </Button>
                </Field>
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                  <div className="flex items-center">
                    <a
                      href="/login"
                      className="ml-auto text-sm underline-offset-2 hover:underline"
                    >
                      <ArrowLeftIcon size={16} className="inline-flex mr-2" />
                      Volver al inicio de sesión
                    </a>
                  </div>
                </FieldSeparator>
              </FieldGroup>
            </div>
            <div className="bg-muted relative hidden md:block">
              <Image
                src={AuthImage}
                alt="Image"
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.7] dark:grayscale"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-6 md:p-8">
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="size-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h1 className="text-2xl font-bold">Contraseña restablecida</h1>
                  <p className="text-muted-foreground text-balance">
                    Tu contraseña fue actualizada exitosamente. Ya podés iniciar sesión con tu nueva contraseña.
                  </p>
                </div>
                <Field>
                  <Button onClick={() => router.push("/login")}>
                    Ir a iniciar sesión
                  </Button>
                </Field>
              </FieldGroup>
            </div>
            <div className="bg-muted relative hidden md:block">
              <Image
                src={AuthImage}
                alt="Image"
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.7] dark:grayscale"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function onSubmit(data: ResetPasswordData) {
    if (data.newPassword !== data.confirmPassword) {
      toast("Las contraseñas no coinciden", {
        description: "Verificá que ambas contraseñas sean iguales.",
        position: "top-right",
      });
      return;
    }

    const res = await resetPassword(data);

    if (res.success) {
      setSuccess(true);
      toast("Contraseña restablecida", {
        description: "Tu contraseña fue actualizada exitosamente.",
        position: "top-right",
      });
    } else {
      toast("Error", {
        description: res.message,
        position: "top-right",
      });
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Nueva contraseña</h1>
                <p className="text-muted-foreground text-balance">
                  Ingresá tu nueva contraseña
                </p>
              </div>
              <Controller
                name="newPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="newPassword">Nueva contraseña</FieldLabel>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        required
                        {...field}
                        aria-invalid={fieldState.invalid}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {fieldState.error && (
                      <p className="text-destructive text-sm">
                        {fieldState.error.message}
                      </p>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="confirmPassword">Confirmar contraseña</FieldLabel>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        required
                        {...field}
                        aria-invalid={fieldState.invalid}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {fieldState.error && (
                      <p className="text-destructive text-sm">
                        {fieldState.error.message}
                      </p>
                    )}
                  </Field>
                )}
              />
              <Field>
                <Button type="submit">Restablecer contraseña</Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                <div className="flex items-center">
                  <a
                    href="/login"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    <ArrowLeftIcon size={16} className="inline-flex mr-2" />
                    Volver al inicio de sesión
                  </a>
                </div>
              </FieldSeparator>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <Image
              src={AuthImage}
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.7] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ResetPasswordForm(props: React.ComponentProps<"div">) {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <ResetFormInner {...props} />
    </Suspense>
  );
}
