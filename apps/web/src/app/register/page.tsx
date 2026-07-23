import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { AuthHeroLayout } from "../../components/login/AuthHeroLayout";
import { RegisterCard } from "../../components/login/RegisterCard";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/opportunities");

  return <AuthHeroLayout rightCard={<RegisterCard />} />;
}
