import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SessionProvider } from "./lib/session";
import { FeedbackProvider } from "./lib/toast";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/animations.css";
import "./styles/components.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><FeedbackProvider><SessionProvider><App /></SessionProvider></FeedbackProvider></StrictMode>,
);
