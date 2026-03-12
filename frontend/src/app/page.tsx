import { redirect } from "next/navigation";

// Ensure we have a single redirect target; login lives at (auth)/login
export default function Home() {
  redirect("/login");
}
