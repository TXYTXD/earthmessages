// One vocabulary of movement for the whole app, so a pressed tab, a landing
// message and a rising sheet all feel like the same hand made them.
//
// Everything here is a spring rather than a duration: springs settle at a
// speed that matches how far they travelled, which is what makes an
// interface feel physical instead of timed.

import type { Transition, Variants } from "framer-motion";

// These are deliberately stiff and light. A spring that takes half a second
// to settle reads as lag, however pretty the curve is: the eye reads the
// START of a movement as the response, so what has to be immediate is the
// first few frames, not the whole journey.

/** Immediate — anything answering a finger. Settles in about a tenth of a second. */
export const snappy: Transition = { type: "spring", stiffness: 900, damping: 38, mass: 0.42 };

/** The everyday one — pills, panels, badges. About a fifth of a second. */
export const springy: Transition = { type: "spring", stiffness: 620, damping: 34, mass: 0.55 };

/** Heavier, with a touch of overshoot — sheets and overlays. */
export const weighty: Transition = { type: "spring", stiffness: 440, damping: 34, mass: 0.75 };

/** For things that should simply appear without bouncing. */
export const gentle: Transition = { type: "tween", duration: 0.16, ease: [0.22, 1, 0.36, 1] };

/** What a tappable thing does under a finger. */
export const tap = { scale: 0.9 };
export const tapSoft = { scale: 0.97 };
export const hoverLift = { scale: 1.04 };

/** A row, a card, a list item arriving. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: springy },
  exit: { opacity: 0, y: -6, transition: gentle },
};

/** A list that deals its children out one after another.
 *  Kept short on purpose: a long cascade means the last row of a big list
 *  arrives a second after the first, which reads as the app being slow. */
export const stagger = (step = 0.018, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

/** A message landing in the thread, from whichever side sent it. */
export const bubbleIn = (mine: boolean): Variants => ({
  hidden: { opacity: 0, y: 12, scale: 0.86, x: mine ? 14 : -14 },
  show: {
    opacity: 1, y: 0, scale: 1, x: 0,
    transition: { type: "spring", stiffness: 700, damping: 34, mass: 0.5 },
  },
});

/** A sheet coming up from the bottom edge. */
export const sheetUp: Variants = {
  hidden: { y: "100%" },
  show: { y: 0, transition: weighty },
  exit: { y: "100%", transition: { type: "tween", duration: 0.16, ease: [0.4, 0, 1, 1] } },
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
