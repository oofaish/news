import AuthForm from "./auth-form";

export default function Home() {
  return (
    <div className="row">
      <div className="col-6">
        <h1 className="header">News Articles</h1>
        <p className="">
          My news reader that looks at RSS feeds from NYT, Guardian, WSJ, and
          FT, with some nice filtering. A complete hack but there you go.
        </p>
      </div>
      <div className="col-6 auth-widget">
        <AuthForm />
      </div>
    </div>
  );
}
