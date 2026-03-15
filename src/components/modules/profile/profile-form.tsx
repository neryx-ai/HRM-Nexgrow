"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  UpdateProfileData,
  UpdateProfileSchema,
  UpdatePasswordData,
  UpdatePasswordSchema,
} from "@/lib/validations/auth";
import { updateProfile, updatePassword } from "@/actions/auth.actions";
import type { User } from "better-auth";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const profileForm = useForm<UpdateProfileData>({
    resolver: valibotResolver(UpdateProfileSchema),
    defaultValues: {
      name: user.name || "",
      image: user.image || "",
    },
  });

  const passwordForm = useForm<UpdatePasswordData>({
    resolver: valibotResolver(UpdatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onProfileSubmit(data: UpdateProfileData) {
    setIsProfileLoading(true);
    const res = await updateProfile(data);

    if (res.success) {
      toast("Perfil actualizado", {
        description: res.message,
        position: "top-right",
        style: {
          "--border-radius": "calc(var(--radius) + 4px)",
        } as React.CSSProperties,
      });
    } else {
      toast("Error al actualizar perfil", {
        description: res.message,
        position: "top-right",
        style: {
          "--border-radius": "calc(var(--radius) + 4px)",
        } as React.CSSProperties,
      });
    }

    setIsProfileLoading(false);
  }

  async function onPasswordSubmit(data: UpdatePasswordData) {
    if (data.newPassword !== data.confirmPassword) {
      toast("Error", {
        description: "Las contraseñas no coinciden",
        position: "top-right",
        style: {
          "--border-radius": "calc(var(--radius) + 4px)",
        } as React.CSSProperties,
      });
      return;
    }

    setIsPasswordLoading(true);
    const res = await updatePassword(data);

    if (res.success) {
      toast("Contraseña actualizada", {
        description: res.message,
        position: "top-right",
        style: {
          "--border-radius": "calc(var(--radius) + 4px)",
        } as React.CSSProperties,
      });
      passwordForm.reset();
    } else {
      toast("Error al actualizar contraseña", {
        description: res.message,
        position: "top-right",
        style: {
          "--border-radius": "calc(var(--radius) + 4px)",
        } as React.CSSProperties,
      });
    }

    setIsPasswordLoading(false);
    router.refresh();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 md:pr-2">
      {/* Información del perfil */}
      <Card>
        <CardHeader>
          <CardTitle>Información del perfil</CardTitle>
          <FieldDescription>
            Actualiza tu nombre e imagen de perfil
          </FieldDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <FieldGroup>
              <Controller
                name="name"
                control={profileForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="name">Nombre completo</FieldLabel>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Juan Pérez"
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
              <Controller
                name="image"
                control={profileForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="image">URL de imagen</FieldLabel>
                    <Input
                      id="image"
                      type="url"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      {...field}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && (
                      <p className="text-destructive text-sm">
                        {fieldState.error.message}
                      </p>
                    )}
                    <FieldDescription>
                      URL pública de tu imagen de perfil
                    </FieldDescription>
                  </Field>
                )}
              />
              <Field>
                <Button type="submit" disabled={isProfileLoading}>
                  {isProfileLoading ? "Guardando..." : "Guardar cambios"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* Cambiar contraseña */}
      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
          <FieldDescription>
            Cambia tu contraseña para mantener tu cuenta segura
          </FieldDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <FieldGroup>
              <Controller
                name="currentPassword"
                control={passwordForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="currentPassword">
                      Contraseña actual
                    </FieldLabel>
                    <Input
                      id="currentPassword"
                      type="password"
                      required
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="current-password"
                    />
                    {fieldState.error && (
                      <p className="text-destructive text-sm">
                        {fieldState.error.message}
                      </p>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="newPassword"
                control={passwordForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="newPassword">
                      Nueva contraseña
                    </FieldLabel>
                    <Input
                      id="newPassword"
                      type="password"
                      required
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="new-password"
                    />
                    {fieldState.error && (
                      <p className="text-destructive text-sm">
                        {fieldState.error.message}
                      </p>
                    )}
                    <FieldDescription>
                      Mínimo 8 caracteres con mayúscula, minúscula, número y
                      carácter especial
                    </FieldDescription>
                  </Field>
                )}
              />
              <Controller
                name="confirmPassword"
                control={passwordForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="confirmPassword">
                      Confirmar contraseña
                    </FieldLabel>
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="new-password"
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
                <Button type="submit" disabled={isPasswordLoading}>
                  {isPasswordLoading
                    ? "Actualizando..."
                    : "Actualizar contraseña"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
