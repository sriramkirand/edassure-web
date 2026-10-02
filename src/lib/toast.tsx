import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastItem { id: number; text: string; kind: "info" | "error" }
interface ConfirmState { title: string; body: string; confirmLabel: string; danger: boolean; resolve: (ok: boolean) => void }
interface Ctx { toast: (text: string, kind?: "info" | "error") => void; confirm: (o: { title: string; body: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean> }
const FeedbackContext = createContext<Ctx | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<ConfirmState | null>(null);
  const next = useRef(1);

  const toast = useCallback((text: string, kind: "info" | "error" = "info") => {
    const id = next.current++;
    setItems((l) => [...l, { id, text, kind }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === "error" ? 7000 : 3500);
  }, []);

  const confirm = useCallback((o: { title: string; body: string; confirmLabel?: string; danger?: boolean }) =>
    new Promise<boolean>((resolve) => setDialog({ title: o.title, body: o.body, confirmLabel: o.confirmLabel ?? "Confirm", danger: !!o.danger, resolve })), []);

  const close = (ok: boolean) => { dialog?.resolve(ok); setDialog(null); };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={"toast " + (t.kind === "error" ? "error" : "")}>{t.text}</div>)}
      </div>
      {dialog && (
        <div className="backdrop" onClick={() => close(false)}>
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="dlg-title">{dialog.title}</h3>
            <p className="muted" style={{ margin: "10px 0 20px" }}>{dialog.body}</p>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => close(false)} autoFocus>Cancel</button>
              <button className={"btn " + (dialog.danger ? "danger" : "")} onClick={() => close(true)}>{dialog.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): Ctx {
  const c = useContext(FeedbackContext);
  if (!c) throw new Error("useFeedback outside FeedbackProvider");
  return c;
}
