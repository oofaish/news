import "./globals.css";

export const metadata = {
  title: "Articles",
  description: "RSS Feeds from Guradian, FT, WSJ and NYT",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="container" style={{ padding: "50px 0 100px 0" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
