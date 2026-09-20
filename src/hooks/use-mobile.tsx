import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// Below this, a chat list and an open chat side by side leaves the messages
// too narrow to read, so the two swap places instead of sharing the width.
// Tablets sit right in this gap: wide enough to look like a desktop, not
// wide enough to behave like one.
const TWO_PANE_BREAKPOINT = 1100;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/** True while the window is too narrow to show a list and a chat side by side. */
export function useIsSinglePane() {
  const [single, setSingle] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${TWO_PANE_BREAKPOINT - 1}px)`);
    const onChange = () => setSingle(window.innerWidth < TWO_PANE_BREAKPOINT);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!single;
}
