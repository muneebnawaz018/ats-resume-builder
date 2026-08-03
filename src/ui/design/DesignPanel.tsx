"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { BUILTIN_THEMES, SAFE_FONTS, type Theme, type ThemeTokens } from "@/schema";
import {
  ColorControl,
  GroupTitle,
  LengthControl,
  NumberControl,
  SelectControl,
  SwitchControl,
  TextControl,
} from "./controls";
import { v } from "@/ui/theme/vars";

/**
 * Every token is exposed. Competitors withhold this to keep output on-brand
 * and reduce support load; nothing here requires that compromise.
 *
 * Edits go through `editTheme`, which forks a built-in rather than mutating
 * it, so presets stay intact.
 */
export function DesignPanel({
  theme,
  safeMode,
  onToken,
  onThemeChange,
}: {
  theme: Theme;
  safeMode: boolean;
  onToken: <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) => void;
  onThemeChange: (id: string) => void;
}) {
  const t = theme.tokens;
  const set =
    <K extends keyof ThemeTokens>(key: K) =>
    (value: ThemeTokens[K]) =>
      onToken(key, value);

  return (
    <Box sx={{ p: 1.75 }}>
      <SelectControl
        label="Preset"
        value={theme.builtin ? theme.id : "__custom"}
        options={[
          ...BUILTIN_THEMES.map((b) => ({ value: b.id, label: b.name })),
          ...(theme.builtin
            ? []
            : [{ value: "__custom", label: `${theme.name}` }]),
        ]}
        onChange={(id) => id !== "__custom" && onThemeChange(id)}
        helper={
          theme.builtin
            ? "Changing anything below forks this preset into your own copy."
            : "Your own theme. Presets are left untouched."
        }
      />

      <GroupTitle>Page</GroupTitle>
      <SelectControl
        label="Page size"
        value={t.pageSize}
        options={[
          { value: "Letter", label: "Letter (8.5 × 11 in)" },
          { value: "A4", label: "A4 (210 × 297 mm)" },
        ]}
        onChange={set("pageSize")}
      />
      <LengthControl
        label="Margin top"
        value={t.marginTop}
        min={0.25}
        max={1.5}
        step={0.05}
        onChange={set("marginTop")}
      />
      <LengthControl
        label="Margin bottom"
        value={t.marginBottom}
        min={0.25}
        max={1.5}
        step={0.05}
        onChange={set("marginBottom")}
      />
      <LengthControl
        label="Margin left"
        value={t.marginLeft}
        min={0.25}
        max={1.5}
        step={0.05}
        onChange={set("marginLeft")}
      />
      <LengthControl
        label="Margin right"
        value={t.marginRight}
        min={0.25}
        max={1.5}
        step={0.05}
        onChange={set("marginRight")}
      />

      <GroupTitle>Type</GroupTitle>
      <SelectControl
        label="Font"
        value={t.fontFamily}
        options={SAFE_FONTS.map((f) => ({ value: f, label: f }))}
        onChange={set("fontFamily")}
        helper={
          safeMode
            ? "These fonts have been round-tripped through the extraction harness. Turn off Safe Mode for the full list."
            : undefined
        }
      />
      <LengthControl
        label="Body size"
        value={t.fontSizeBase}
        min={safeMode ? 9 : 7}
        max={14}
        step={0.25}
        onChange={set("fontSizeBase")}
      />
      <NumberControl
        label="Line height"
        value={t.lineHeight}
        min={1}
        max={2}
        step={0.01}
        onChange={set("lineHeight")}
      />
      <NumberControl
        label="Type scale"
        value={t.typeScale}
        min={1}
        max={1.6}
        step={0.01}
        onChange={set("typeScale")}
      />

      <GroupTitle>Name</GroupTitle>
      <LengthControl
        label="Name size"
        value={t.nameSize}
        min={12}
        max={34}
        step={0.5}
        onChange={set("nameSize")}
      />
      <SelectControl
        label="Name weight"
        value={t.nameWeight}
        options={[
          { value: 400 as const, label: "Regular" },
          { value: 600 as const, label: "Semibold" },
          { value: 700 as const, label: "Bold" },
        ]}
        onChange={set("nameWeight")}
      />
      <SelectControl
        label="Name alignment"
        value={t.nameAlign}
        options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Centre" },
        ]}
        onChange={set("nameAlign")}
      />

      <GroupTitle>Section headings</GroupTitle>
      <LengthControl
        label="Heading size"
        value={t.headingSize}
        min={8}
        max={18}
        step={0.25}
        onChange={set("headingSize")}
      />
      <SelectControl
        label="Heading weight"
        value={t.headingWeight}
        options={[
          { value: 400 as const, label: "Regular" },
          { value: 500 as const, label: "Medium" },
          { value: 600 as const, label: "Semibold" },
          { value: 700 as const, label: "Bold" },
        ]}
        onChange={set("headingWeight")}
      />
      <SelectControl
        label="Heading case"
        value={t.headingCase}
        options={[
          { value: "none", label: "As typed" },
          { value: "upper", label: "UPPERCASE" },
          { value: "capitalize", label: "Capitalised" },
        ]}
        onChange={set("headingCase")}
      />
      <SelectControl
        label="Heading alignment"
        value={t.headingAlign}
        options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Centre" },
        ]}
        onChange={set("headingAlign")}
      />
      <LengthControl
        label="Letter spacing"
        value={t.headingLetterSpacing}
        min={0}
        max={3}
        step={0.1}
        onChange={set("headingLetterSpacing")}
      />
      <SelectControl
        label="Rule"
        value={t.headingRule}
        options={[
          { value: "none", label: "None" },
          { value: "full", label: "Full width" },
          { value: "underText", label: "Under the text" },
        ]}
        onChange={set("headingRule")}
      />
      <LengthControl
        label="Rule weight"
        value={t.ruleWeight}
        min={0.25}
        max={3}
        step={0.25}
        onChange={set("ruleWeight")}
      />
      <ColorControl
        label="Rule colour"
        value={t.ruleColor}
        onChange={set("ruleColor")}
      />

      <GroupTitle>Spacing</GroupTitle>
      <LengthControl
        label="Between sections"
        value={t.sectionGap}
        min={0}
        max={30}
        onChange={set("sectionGap")}
      />
      <LengthControl
        label="Between items"
        value={t.itemGap}
        min={0}
        max={24}
        onChange={set("itemGap")}
      />
      <LengthControl
        label="Between bullets"
        value={t.bulletGap}
        min={0}
        max={12}
        step={0.25}
        onChange={set("bulletGap")}
      />
      <LengthControl
        label="Between paragraphs"
        value={t.paragraphGap}
        min={0}
        max={16}
        step={0.5}
        onChange={set("paragraphGap")}
      />

      <GroupTitle>Layout</GroupTitle>
      <SelectControl
        label="Dates"
        value={t.dateAlign}
        options={[
          { value: "right", label: "Right aligned" },
          { value: "inline", label: "Inline with the title" },
        ]}
        onChange={set("dateAlign")}
      />
      <SelectControl
        label="Contact details"
        value={t.contactLayout}
        options={[
          { value: "inline", label: "One line" },
          { value: "stacked", label: "Stacked" },
        ]}
        onChange={set("contactLayout")}
      />
      <TextControl
        label="Contact separator"
        value={t.contactSeparator}
        onChange={set("contactSeparator")}
        mono
      />

      <GroupTitle>Bullets</GroupTitle>
      <SelectControl
        label="Bullet character"
        value={t.bulletChar}
        options={[
          { value: "•", label: "• Round" },
          { value: "–", label: "– En dash" },
          { value: "-", label: "- Hyphen" },
          { value: "▪", label: "▪ Square" },
        ]}
        onChange={set("bulletChar")}
        helper={
          safeMode
            ? "Decorative glyphs extract as noise or as nothing at all."
            : undefined
        }
      />
      <LengthControl
        label="Bullet indent"
        value={t.bulletIndent}
        min={6}
        max={28}
        onChange={set("bulletIndent")}
      />
      <SwitchControl
        label="Hanging indent"
        value={t.bulletHangingIndent}
        onChange={set("bulletHangingIndent")}
      />

      <GroupTitle>Colour</GroupTitle>
      <ColorControl
        label="Body text"
        value={t.colorText}
        onChange={set("colorText")}
      />
      <ColorControl
        label="Headings"
        value={t.colorHeading}
        onChange={set("colorHeading")}
      />
      <ColorControl
        label="Secondary text"
        value={t.colorMuted}
        onChange={set("colorMuted")}
      />
      <ColorControl
        label="Links"
        value={t.colorLink}
        onChange={set("colorLink")}
      />

      <Typography sx={{ fontSize: 11, color: v.text3, mt: 3 }}>
        Themes are plain JSON. Export one to share it, or import someone
        else&rsquo;s.
      </Typography>
    </Box>
  );
}
