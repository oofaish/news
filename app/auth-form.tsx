"use client";

import { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "./database.types";
import { useRouter } from "next/navigation";

export default function AuthForm() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  });

  return (
    <Auth
      supabaseClient={supabase}
      view="sign_in"
      //appearance={{ theme: ThemeSupa }}
      theme="light"
      showLinks={false}
      providers={[]}
    />
  );
}
