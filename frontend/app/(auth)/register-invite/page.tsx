import { Suspense } from "react";
import RegisterInviteForm from "./RegisterInviteForm";

export default function RegisterInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Chargement...</div>}>
      <RegisterInviteForm />
    </Suspense>
  );
}
