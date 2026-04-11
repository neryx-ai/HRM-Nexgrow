"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import AuthImage from "@/app/assets/urban-scene.png";
import { ArrowLeftIcon, Mail } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { RequestPasswordResetData, RequestPasswordResetSchema } from "@/lib/validations/auth";
import { requestPasswordReset } from "@/actions/auth.actions";
import { toast } from "sonner";
import { useState } from "react";

export function RecoveryForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<RequestPasswordResetData>({
    resolver: valibotResolver(RequestPasswordResetSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: RequestPasswordResetData) {
    const res = await requestPasswordReset(data);

    if (res.success) {
      setSubmitted(true);
      toast("Solicitud enviada", {
        description: res.message,
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
          <div className="p-6 md:p-8">
            {submitted ? (
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="size-6 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold">Correo enviado</h1>
                  <p className="text-muted-foreground text-balance">
                    Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisá también la carpeta de spam.
                  </p>
                </div>
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
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
                    <p className="text-muted-foreground text-balance">
                      Introduce tu correo electrónico y te enviaremos un enlace para restablecerla
                    </p>
                  </div>
                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
                        <Input
                          id="email"
                          type="email"
                          placeholder="m@example.com"
                          required
                          {...field}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.error && (
                          <p className="text-destructive text-sm">
                            {fieldState.error.message}
                          </p>
                        )}
                      </Field>
                    )}
                  />
                  <Field>
                    <Button type="submit">Enviar enlace</Button>
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
            )}
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
