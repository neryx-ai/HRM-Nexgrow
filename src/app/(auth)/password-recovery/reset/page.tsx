import React from "react";
import { ResetPasswordForm } from "./reset-form";

export const metadata = {
  title: "Restablecer contraseña — Jivis RRHH",
};

function ResetPasswordPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <ResetPasswordForm />
      </div>
    </div>
  );
}

export default ResetPasswordPage;
