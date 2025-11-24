// src/app/(auth)/sign-in/page.tsx
"use client";

import { SignInView } from "@/modules/auth/ui/views/sign-in-view";
import { SignUpView } from "@/modules/auth/ui/views/sign-up-view";

export default function Page() {
  return <SignUpView />;
}
