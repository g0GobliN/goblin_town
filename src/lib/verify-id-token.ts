import { getEnv } from "./env";

export type VerifiedIdToken = {
  uid: string;
  email?: string;
  email_verified?: boolean;
};

/** Verify a Firebase Auth ID token via Identity Toolkit (Workers-safe, no Admin SDK). */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedIdToken> {
  const apiKey = getEnv("PUBLIC_FIREBASE_API_KEY");
  if (!apiKey) throw new Error("PUBLIC_FIREBASE_API_KEY is not set");

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ID token lookup failed: ${text}`);
  }

  const data = (await res.json()) as {
    users?: Array<{
      localId?: string;
      email?: string;
      emailVerified?: boolean;
    }>;
  };

  const user = data.users?.[0];
  if (!user?.localId) throw new Error("Invalid or expired token");

  return {
    uid: user.localId,
    email: user.email,
    email_verified: user.emailVerified,
  };
}
