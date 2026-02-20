import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import Image from "next/image";

import AuthImage from "@/app/assets/urban-scene.png";
import { ArrowLeftIcon } from "lucide-react";

export function RecoveryForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
                <p className="text-muted-foreground text-balance">
                  Introduce tu correo electrónico para recuperar la contraseña
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <Button type="submit">Enviar</Button>
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
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
