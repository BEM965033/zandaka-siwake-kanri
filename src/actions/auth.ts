"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const AUTH_COOKIE = "auth_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30日

export async function login(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const password = formData.get("password") as string;

  if (!password || password !== process.env.AUTH_PASSWORD) {
    return { error: "パスワードが違う" };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, process.env.AUTH_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "", { maxAge: 0 });
  redirect("/login");
}
