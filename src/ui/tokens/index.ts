/**
 * Design tokens: the single source for colour, radius, shadow and motion.
 *
 * Deliberately separate from @/ui/theme. The MUI theme reads these, and so
 * does scripts/tasks.ts (tokens task) when it writes the CSS custom properties, but
 * this module imports nothing, so a content route can read a palette value
 * without dragging the MUI runtime along with it. Merging the two barrels put
 * 33KB of Emotion on every static page.
 */
export * from "./tokens";
