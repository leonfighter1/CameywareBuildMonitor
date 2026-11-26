import {
  Badge,
  Button,
  Card,
  Chip,
  Container,
  createTheme,
  type MantineColorsTuple,
  Modal,
  Paper,
  Table,
} from "@mantine/core";

/**
 * Mantine's own components, in the site's type and shapes; the colours come from globals.css (the site's tokens, an
 * app's on its own pages).
 */
export const theme = createTheme({
  primaryColor: "brand",
  // Mantine asks for ten steps; each is the accent, which globals.css gives for both themes.
  colors: { brand: Array(10).fill("var(--t-accent)") as unknown as MantineColorsTuple },
  defaultRadius: "md",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  // The site's headings in its sans (2026-11-22); an app's pages set their own (globals.css [data-skin]).
  headings: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
    fontWeight: "700",
  },
  components: {
    // The owner, 2026-11-06: at most 1620 wide on a large screen, as the app's pages are. Pages of text set their own, narrower.
    Container: Container.extend({ defaultProps: { size: 1620 } }),
    Card: Card.extend({
      defaultProps: { withBorder: true, radius: "lg", padding: "lg" },
      styles: { root: { background: "var(--t-card)" } },
    }),
    Paper: Paper.extend({ styles: { root: { background: "var(--t-card)" } } }),
    Modal: Modal.extend({ defaultProps: { centered: true } }),
    // Its words as written, on as many lines as they need (Mantine's are capitals, on one line).
    Badge: Badge.extend({
      styles: {
        root: { height: "auto", paddingBlock: 4 },
        label: { textTransform: "none", whiteSpace: "normal", overflow: "visible" },
      },
      // A filled badge's words on the accent, as a main button's (权限管理's 超级管理员; Mantine's are white).
      vars: (_theme, props) => ({
        root:
          !props.color && (!props.variant || props.variant === "filled")
            ? { "--badge-color": "var(--t-on-accent)" }
            : {},
      }),
    }),
    Button: Button.extend({
      defaultProps: { radius: "md" },
      // A main button's words on the accent, in both themes (Mantine's are white; other variants set their own).
      vars: (_theme, props) => ({
        root:
          !props.color && (!props.variant || props.variant === "filled")
            ? { "--button-color": "var(--t-on-accent)" }
            : {},
      }),
    }),
    // A chosen chip's words on the accent, as a main button's (收到的反馈's filters; Mantine's are white).
    Chip: Chip.extend({
      vars: (_theme, props) => ({
        root:
          !props.color && (!props.variant || props.variant === "filled")
            ? { "--chip-color": "var(--t-on-accent)" }
            : {},
      }),
    }),
    Table: Table.extend({ defaultProps: { verticalSpacing: "sm" } }),
  },
});
