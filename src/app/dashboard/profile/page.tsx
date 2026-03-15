import { getUserProfile } from "@/actions/auth.actions";
import { ProfileForm } from "@/components/modules/profile/profile-form";
import type { User } from "better-auth";

interface UserProfileResponse {
  user: User;
}

export default async function ProfilePage() {
  const result = await getUserProfile();

  if (!result.success || !result.data) {
    return (
      <div className="p-2">
        <h1>Perfil</h1>
        <p className="text-muted-foreground">
          No se pudo cargar la información del perfil.
        </p>
      </div>
    );
  }

  const userData = result.data as UserProfileResponse;
  const user = userData.user;

  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold mb-6">Datos de usuario</h1>
      <ProfileForm user={user} />
    </div>
  );
}
