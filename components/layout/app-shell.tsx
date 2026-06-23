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
const COLLAPSED_WIDTH = 44;

type AppShellProps = {
  children?: ReactNode;
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
      className={`flex items-center justify-center border-border bg-surface-muted text-muted transition-colors hover:bg-surface hover:text-foreground ${
        edge === "left"
          ? "h-full w-9 shrink-0 border-r"
          : "h-9 w-full shrink-0 border-b"
      }`}
      aria-expanded={!collapsed}
      aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
      title={collapsed ? `Expand ${label}` : `Collapse ${label}`}
    >
      <span className="text-xs font-medium">
        {edge === "left" ? (collapsed ? "›" : "‹") : collapsed ? "▼" : "▲"}
      </span>
      {!collapsed ? (
        <span className={`text-xs font-semibold ${edge === "left" ? "ml-1 -rotate-90" : "ml-2"}`}>
          {label}
        </span>
      ) : null}
    </button>
  );
}

export function AppShell({ children }: AppShellProps) {
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
    <div ref={shellRef} className="flex min-h-0 flex-1 overflow-hidden">
      <aside
        className="flex shrink-0 flex-col border-r border-border bg-surface"
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
              <p className="text-sm font-semibold text-foreground">Menu</p>
              <p className="mt-2 text-sm text-muted">
                Navigation and student tools will appear here in later phases.
              </p>
            </div>
          ) : null}
        </div>
      </aside>

      {!menuCollapsed ? (
        <div
          className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-accent/40"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize menu pane"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <section className="flex shrink-0 flex-col border-b border-border bg-surface">
          <PaneToggle
            label="Calendar"
            collapsed={calendarCollapsed}
            onToggle={() => setCalendarCollapsed((value) => !value)}
            edge="top"
          />
          {!calendarCollapsed ? (
            <div className="overflow-y-auto p-4" style={{ maxHeight: "28vh" }}>
              <p className="text-sm font-semibold text-foreground">Calendar</p>
              <p className="mt-2 text-sm text-muted">
                Your schedule will appear here in a later phase.
              </p>
            </div>
          ) : null}
        </section>

        <main className="min-h-0 flex-1 overflow-y-auto bg-background p-6 md:p-8">
          {children ?? (
            <div className="mx-auto max-w-2xl space-y-4">
              <h1 className="text-2xl font-semibold text-foreground">
                Welcome to MicroSchool Lesson Planner
              </h1>
              <p className="text-sm leading-7 text-muted">
                MicroSchool helps parents and teachers plan personalized lessons
                for each student. Use the layout around this page to navigate once
                features are added.
              </p>
              <div className="rounded-lg border border-border bg-surface p-4 text-sm leading-7 text-foreground">
                <p className="font-medium">How to use the app shell</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                  <li>
                    <strong className="text-foreground">Menu</strong> (left): drag
                    the divider to resize, or click the arrow to collapse it.
                  </li>
                  <li>
                    <strong className="text-foreground">Calendar</strong> (top
                    right): click the bar to show or hide the calendar pane.
                  </li>
                  <li>
                    <strong className="text-foreground">Main pane</strong> (this
                    area): lesson content and tools will open here.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
