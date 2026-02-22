import { redirect } from "next/navigation";

// Main page - redirects to login or dashboard
// Auth check will be handled by middleware or client-side
export default function HomePage() {
  // For now, redirect to login
  // Later, middleware will handle auth redirects
  redirect("/login");
}
