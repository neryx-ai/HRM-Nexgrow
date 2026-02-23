import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-foreground/70">
        Esta pagina estará protegida por un sistema de autenticación y un
        sistema de autorización por roles.
      </p>

      <hr className="my-5" />

      <p>Acceso a las paginas de autenticación temporalmente:</p>
      <div className="flex gap-2 mt-2">
        <Link href="/login">
          <Button className="cursor-pointer">Inicio de sesión</Button>
        </Link>
        <Link href="/password-recovery">
          <Button variant="outline" className="cursor-pointer">
            Recuperar contraseña
          </Button>
        </Link>
      </div>
    </div>
  );
}
