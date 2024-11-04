import "./globals.css";

export const metadata = {
  title: "Articles",
  description: "RSS Feeds from Guradian, FT, WSJ and NYT",
};

import { headers, cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import SupabaseProvider from "./supabase-provider";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <body>
        <SupabaseProvider session={session}>
          <div className="container" style={{ padding: "50px 0 100px 0" }}>
            {children}
          </div>
        </SupabaseProvider>
      </body>
    </html>
  );
}
