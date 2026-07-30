/**
 * The design panel: every theme token, exposed as a control.
 *
 * Loaded through next/dynamic by the inspector, so it stays out of the initial
 * editor bundle. Keep this barrel to the panel alone, adding an eagerly
 * imported export here would pull the whole panel back into that bundle.
 */
export { DesignPanel } from "./DesignPanel";
