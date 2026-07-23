import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { AuthHeroLayout } from "../../components/login/AuthHeroLayout";
import { LoginCard } from "../../components/login/LoginCard";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/explorar");

  return <AuthHeroLayout rightCard={<LoginCard />} />;
}
