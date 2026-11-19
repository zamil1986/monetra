import { ViewTransition, type ReactNode } from "react";

/**
 * A screen fades and rises in when it is navigated to (styles: `.page` in globals.css).
 * Only enter and exit animate: refreshes and form updates on the same screen stay still,
 * and browsers without the View Transitions API simply swap the screen.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      {children}
    </ViewTransition>
  );
}
