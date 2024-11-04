"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  Session,
  SupabaseClient,
  createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Database } from "./database.types";

type MaybeSession = Session | null;

type SupabaseContext = {
  supabase: SupabaseClient<any, string>;
  session: MaybeSession;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export default function SupabaseProvider({
  children,
  session: initialSession,
}: {
  children: React.ReactNode;
  session: MaybeSession;
}) {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const [session, setSession] = useState<MaybeSession>(initialSession);

  useEffect(() => {
    // Check and refresh session on mount
    const refreshSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
    };

    refreshSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      if (event === "SIGNED_OUT") {
        router.push("/");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setSession(newSession);
        router.refresh();
      }
    });

    // Set up periodic session refresh (every 10 minutes)
    const intervalId = setInterval(refreshSession, 10 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [router, supabase]);

  return (
    <Context.Provider value={{ supabase, session }}>
      {children}
    </Context.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider");
  }
  return context.supabase;
};

export const useSession = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useSession must be used inside SupabaseProvider");
  }
  return context.session;
};
