import React from "react";
import { RecoveryForm } from "./recovery-form";

function PasswordRecoveryPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <RecoveryForm />
      </div>
    </div>
  );
}

export default PasswordRecoveryPage;
