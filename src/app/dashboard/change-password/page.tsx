import React from "react";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = {
  title: "Cambiar contraseña — Jivis RRHH",
};

function ChangePasswordPage() {
  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <ChangePasswordForm />
      </div>
    </div>
  );
}

export default ChangePasswordPage;
