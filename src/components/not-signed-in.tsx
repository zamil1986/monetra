import { redirect } from "next/navigation";

/** Pages render this when the session is missing or has ended; the sign-in page takes over. */
export function NotSignedIn(): never {
  redirect("/login");
}
