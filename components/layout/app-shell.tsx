"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const MIN_MENU_WIDTH = 220;
const MAX_MENU_WIDTH = 520;
const COLLAPSED_WIDTH = 48;

type AppShellProps = {
  children?: ReactNode;
  showIntro?: boolean;
};

function PaneToggle({
  label,
  collapsed,
  onToggle,
  edge,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  edge: "left" | "top";
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex shrink-0 items-center gap-2 border-border bg-surface-muted text-foreground transition-colors hover:bg-accent-soft ${
        edge === "left"
          ? "h-full w-10 flex-col justify-center border-r px-1"
          : "h-10 w-full border-b px-3"
      }`}
      aria-expanded={!collapsed}
      aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
      title={collapsed ? `Expand ${label}` : `Collapse ${label}`}
    >
      <span className="text-base font-bold leading-none text-accent">
        {edge === "left" ? (collapsed ? "›" : "‹") : collapsed ? "▼" : "▲"}
      </span>
      <span
        className={`text-xs font-semibold uppercase tracking-wide text-muted ${
          edge === "left" ? "writing-mode-vertical [writing-mode:vertical-rl]" : ""
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export function AppShell({ children, showIntro = true }: AppShellProps) {
  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);
  const [menuWidth, setMenuWidth] = useState(320);
  const shellRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);

  useEffect(() => {
    function setInitialMenuWidth() {
      if (!shellRef.current) return;
      const target = Math.round(shellRef.current.offsetWidth * 0.33);
      setMenuWidth(Math.min(MAX_MENU_WIDTH, Math.max(MIN_MENU_WIDTH, target)));
    }

    setInitialMenuWidth();
    window.addEventListener("resize", setInitialMenuWidth);
    return () => window.removeEventListener("resize", setInitialMenuWidth);
  }, []);

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (menuCollapsed) return;
      resizingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [menuCollapsed],
  );

  const onResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!resizingRef.current || !shellRef.current) return;
      const bounds = shellRef.current.getBoundingClientRect();
      const nextWidth = event.clientX - bounds.left;
      setMenuWidth(Math.min(MAX_MENU_WIDTH, Math.max(MIN_MENU_WIDTH, nextWidth)));
    },
    [],
  );

  const onResizePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    resizingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  useEffect(() => {
    function onWindowPointerUp() {
      resizingRef.current = false;
    }

    window.addEventListener("pointerup", onWindowPointerUp);
    return () => window.removeEventListener("pointerup", onWindowPointerUp);
  }, []);

  const effectiveMenuWidth = menuCollapsed ? COLLAPSED_WIDTH : menuWidth;

  return (
    <div ref={shellRef} className="flex min-h-0 flex-1 overflow-hidden bg-background">
      <aside
        className="flex shrink-0 flex-col border-r-2 border-border-strong bg-surface shadow-sm"
        style={{ width: effectiveMenuWidth }}
      >
        <div className="flex min-h-0 flex-1">
          <PaneToggle
            label="Menu"
            collapsed={menuCollapsed}
            onToggle={() => setMenuCollapsed((value) => !value)}
            edge="left"
          />
          {!menuCollapsed ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <p className="text-base font-semibold text-foreground">Menu</p>
              <p className="mt-2 text-sm text-muted">
                Navigation and student tools will appear here in later phases.
              </p>
            </div>
          ) : null}
        </div>
      </aside>

      {!menuCollapsed ? (
        <div
          className="w-1.5 shrink-0 cursor-col-resize bg-border-strong hover:bg-accent"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize menu pane"
          title="Drag to resize menu"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <section className="flex shrink-0 flex-col border-b-2 border-border-strong bg-surface shadow-sm">
          <PaneToggle
            label="Calendar"
            collapsed={calendarCollapsed}
            onToggle={() => setCalendarCollapsed((value) => !value)}
            edge="top"
          />
          {!calendarCollapsed ? (
            <div className="max-h-[28vh] overflow-y-auto border-t border-border p-4">
              <p className="text-base font-semibold text-foreground">Calendar</p>
              <p className="mt-2 text-sm text-muted">
                Your schedule will appear here in a later phase.
              </p>
            </div>
          ) : null}
        </section>

        <main className="min-h-0 flex-1 overflow-y-auto bg-background p-6 md:p-8">
          {children}
          {showIntro ? (
            <div className="mx-auto max-w-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Welcome to MicroSchool Lesson Planner
              </h2>
              <p className="text-sm leading-7 text-muted">
                MicroSchool helps parents and teachers plan personalized lessons
                for each student.
              </p>
              <div className="rounded-lg border border-border bg-surface p-4 text-sm leading-7 text-foreground">
                <p className="font-medium">How to use the app shell</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                  <li>
                    <strong className="text-foreground">Menu</strong> (left):
                    drag the divider to resize, or click the arrow to collapse.
                  </li>
                  <li>
                    <strong className="text-foreground">Calendar</strong> (top
                    right): click the bar to show or hide.
                  </li>
                  <li>
                    <strong className="text-foreground">Main pane</strong>{" "}
                    (here): lesson content and tools will open here.
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
