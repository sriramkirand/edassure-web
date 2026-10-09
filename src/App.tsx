import { Layout } from "./components/Layout";
import { PageSkeleton } from "./components/ui";
import { useRoute } from "./lib/router";
import { useSession } from "./lib/session";
import { Admin } from "./views/Admin";
import { ChangePasswordView, LoginView, SetupView } from "./views/Auth";
import { Landing } from "./views/Landing";
import { NewRun } from "./views/NewRun";
import { RunDetail } from "./views/RunDetail";
import { RunsList } from "./views/RunsList";
import { Verify } from "./views/Verify";

export function App() {
  const { state, user } = useSession();
  const route = useRoute();

  const verify = route.path.match(/^\/verify\/([\w-]+)$/);
  if (verify) return <Verify code={verify[1]} />; // public: no sign-in needed
  if (state.phase === "loading") return <div className="wrap main"><PageSkeleton /></div>;
  if (state.phase === "setup") return <SetupView />;
  if (!user) return route.path === "/login" ? <LoginView /> : route.path === "/" ? <Landing /> : <LoginView />;

  const p = route.path;
  let view: React.ReactNode;
  const run = p.match(/^\/runs\/([\w-]+)$/), adm = p.match(/^\/admin(?:\/(\w+))?$/);
  if (user.mustChange) view = <ChangePasswordView forced />;
  else if (p === "/account") view = <ChangePasswordView forced={false} />;
  else if (adm) view = user.role === "admin" ? <Admin tab={adm[1] ?? "users"} /> : <p className="muted">Administrators only.</p>;
  else if (p === "/new") view = <NewRun />;
  else if (run) view = <RunDetail id={run[1]} route={route} key={run[1]} />;
  else view = <RunsList />;
  return <Layout route={route}>{view}</Layout>;
}
