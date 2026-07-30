/**
 * How each section type renders inside the document.
 *
 * Only SectionBody leaves this folder. Bullets and ItemHead are its building
 * blocks, imported by their sibling directly — re-exporting them here would be
 * surface nobody uses, which is what `npm run knip` fails the build over.
 */
export { SectionBody } from "./SectionBody";
