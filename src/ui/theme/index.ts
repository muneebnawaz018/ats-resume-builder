/**
 * MUI theme and its provider.
 *
 * Importing from here pulls the MUI runtime, which is why design tokens live
 * in @/ui/tokens instead, a content route can read a colour without paying
 * for Emotion. the boundaries task in `scripts/tasks.ts` fails the build if a content route imports
 * this folder.
 *
 * The theme object itself is not exported: AppProviders is the only thing that
 * consumes it, and it sits next door.
 */
export { AppProviders } from "./AppProviders";
