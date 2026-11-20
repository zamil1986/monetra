import { cache } from "react";
import { ServiceError } from "./errors";
import { currentUserId } from "./session";
import { getUser } from "./users";

/** For server components: the Pengguna, or null when nobody is signed in. Read once per request. */
export const currentUser = cache(async () => {
  try {
    return await getUser(await currentUserId());
  } catch (e) {
    if (e instanceof ServiceError) return null;
    throw e;
  }
});
