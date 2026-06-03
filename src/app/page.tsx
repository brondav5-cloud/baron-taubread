import { redirect } from "next/navigation";

export default async function HomePage() {
  // Auth redirect for "/" is already enforced in middleware.
  // Skipping an extra auth round-trip here removes white-screen delay.
  redirect("/dashboard");
}
