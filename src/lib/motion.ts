// One vocabulary of movement for the whole app, so a pressed tab, a landing
// message and a rising sheet all feel like the same hand made them.
//
// Everything here is a spring rather than a duration: springs settle at a
// speed that matches how far they travelled, which is what makes an
// interface feel physical instead of timed.

import type { Transition, Variants } from "framer-motion";

/** Quick and tight — for something answering a press right now. */
export const snappy: Transition = { type: "spring", stiffness: 520, damping: 30, mass: 0.6 };

/** The everyday one — panels, pills, badges. */
export const springy: Transition = { type: "spring", stiffness: 340, damping: 28, mass: 0.8 };

/** Heavier, with a little overshoot — sheets and overlays. */
export const weighty: Transition = { type: "spring", stiffness: 260, damping: 26, mass: 1 };

/** For things that should simply appear without bouncing. */
export const gentle: Transition = { type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] };

/** What a tappable thing does under a finger. */
export const tap = { scale: 0.9 };
export const tapSoft = { scale: 0.97 };
export const hoverLift = { scale: 1.04 };

/** A row, a card, a list item arriving. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: springy },
  exit: { opacity: 0, y: -8, scale: 0.985, transition: gentle },
};

/** A list that deals its children out one after another. */
export const stagger = (step = 0.035, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

/** A message landing in the thread, from whichever side sent it. */
export const bubbleIn = (mine: boolean): Variants => ({
  hidden: { opacity: 0, y: 12, scale: 0.86, x: mine ? 14 : -14 },
  show: {
    opacity: 1, y: 0, scale: 1, x: 0,
    transition: { type: "spring", stiffness: 420, damping: 26, mass: 0.7 },
  },
});

/** A sheet coming up from the bottom edge. */
export const sheetUp: Variants = {
  hidden: { y: "100%" },
  show: { y: 0, transition: weighty },
  exit: { y: "100%", transition: { type: "tween", duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

/** The dimmed backdrop behind a sheet or dialog. */
export const backdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: gentle },
  exit: { opacity: 0, transition: gentle },
};

/** Moving between screens. */
export const pageIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: springy },
  exit: { opacity: 0, y: -6, transition: gentle },
};
