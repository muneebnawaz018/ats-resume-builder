/**
 * The editor's public surface is one component.
 *
 * An earlier version of this barrel re-exported all thirteen parts. Nothing
 * imported them, and it meant any consumer reaching for one small piece would
 * pull the whole editor and the MUI runtime with it — the same failure mode
 * that put Emotion on the content routes. Parts are imported directly by their
 * siblings; routes need only this.
 */
export { EditorShell } from "./EditorShell";
