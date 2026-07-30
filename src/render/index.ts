/**
 * The resume document, the thing that becomes a PDF or a DOCX.
 *
 * Plain CSS driven by custom properties, no MUI and no Emotion, because the
 * DOCX serialiser has to read these styles back. See docs/03-architecture.md.
 */
export { ResumeDocument } from "./ResumeDocument";
export { lengthToCss } from "./tokens";
