---
name: 拾忆
description: A quiet botanical study desk for personal recall.
colors:
  forest: "#244c3e"
  forest-dark: "#193b2f"
  leaf: "#dce8ba"
  canvas: "#f7f8f2"
  surface: "#fffef9"
  ink: "#293b32"
  muted: "#687368"
  line: "#dfe4d8"
  rust: "#a25236"
  math: "#566c3a"
  english: "#586a95"
  focus: "#497642"
typography:
  headline:
    fontFamily: '"Songti SC", "STSong", "SimSun", serif'
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: ".02em"
  body:
    fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: "14px"
  button:
    fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  control: "8px"
  card: "14px"
  dialog: "16px"
spacing:
  control-x: "19px"
  control-y: "10px"
  desktop-gutter: "44px"
  mobile-gutter: "22px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "#fffef8"
    rounded: "{rounded.control}"
    padding: "10px 19px"
  button-primary-hover:
    backgroundColor: "{colors.forest-dark}"
  button-secondary:
    backgroundColor: "#fdfef8"
    textColor: "#3f5f40"
    rounded: "{rounded.control}"
    padding: "10px 19px"
---

# Design System: 拾忆

## Overview

**Creative North Star: "Botanical study-book"**

A quiet learning desk with warm paper, forest green controls, and Chinese book typography. Familiar navigation frames the reading surface; the current study action stays visually strongest. This describes the implemented system, with desktop and mobile welcome screenshots reviewed on 2026-10-20.

Key characteristics: warm tonal layers, restrained ruled divisions, generous reading space, and explicit action labels.

## Colors

Forest carries primary actions and selected navigation. Leaf marks selection and progress; rust distinguishes relearning. Mathematics and English use their named accent tokens. Canvas, paper, ink, muted text, and line tokens provide the reading hierarchy.

## Typography

Songti/STSong/SimSun provide Chinese book-style headings. PingFang/Microsoft YaHei/system sans provide interface text. Desktop page headings use 30px/1.5 at weight 600; mobile uses 27px. Welcome copy is 33px/1.65 on desktop and 30px/1.7 on mobile. Review questions use 21px on mobile and answers 18px. KaTeX renders mathematical content. Tabular numerals keep counts stable.

## Layout

Desktop uses a fixed 224px navigation rail and workspace with 44px gutters. The reading grid uses a flexible main column, a 255px subject panel, and a 28px gap. Maximum main width is 1450px. At 1250px the rail narrows to 204px. At 1050px the reading grid becomes one column. At 760px navigation moves to the top, gutters become 22px, and the start control fills the reading width. A 375px breakpoint further compacts spacing. Desktop welcome cards have a 425px minimum height; mobile welcome cards use 395px.

## Elevation & Depth

The resting workspace uses tonal layers and thin borders. Elevated dialogs use `0 18px 65px -24px #1535253b`; toast feedback uses `0 10px 40px -10px #12342350`. Reserve this depth for overlays and transient feedback.

## Shapes

Study surfaces use 14px corners and a thin ruled border. Controls use 8px corners; dialogs use 16px. Small marks and badges remain compact. Icons use consistent outlined SVG strokes; subject marks use mathematical and language notation.

## Components

The library supports vocabulary type and learning-state selects plus text search. Paginated lists render 30 cards per page; pagination uses the existing secondary button and quiet count styles. Import previews show counts and the explicit example-cleanup checkbox inside the existing pale-leaf notice surface. On narrow screens backup navigation keeps an accessible name even when its text is hidden.

The initial scope is all content. All-content and English controls lead the course row and show their full counts on desktop and mobile. The English library names words and phrases directly; pagination appears above and below the list. The study introduction distinguishes the selected library total from today's scheduled cards.

Backup actions retain the existing primary download button and add a text-style copy action. Copying reveals a labelled read-only JSON text area as a manual fallback; an explicit collapse action clears that temporary snapshot. The JSON remains local and appears only after the learner requests a backup.

Primary buttons use forest with warm-white text and darken on hover. Secondary buttons use pale paper and a green-tinted border. Controls expose a 3px focus outline with 4px offset. Disabled controls use half opacity.

Navigation is text with a small outlined icon. Selected entries use forest and warm white; subject selection uses pale green. On mobile the three main destinations form a familiar top row and backup remains beside the brand.

Study cards use paper, a border, and a spacious reading area. Search fields use pale paper, an 8px radius, a thin border, and forest caret. Subject tags use restrained discipline colors. The daily plan is a divided strip rather than separate metric cards.

Progress grows with the authored `cubic-bezier(.16,1,.3,1)` easing. Reduced-motion preference removes animations and transitions. Selection, caret, scrollbar, and focus colors belong to the same palette.

English study uses a segmented direction control for 英背中 and 中背英 in the existing forest/paper palette, with explicit pressed states and at least 44px touch targets on mobile. 中背英 hides the English answer and pronunciation control until reveal; pronunciation status provides accessible live feedback. Both directions reuse the same card identity and shared review progress.

## Do's and Don'ts

- Do keep the reading prompt and next study action prominent.
- Do retain familiar Chinese action labels and visible local-save context.
- Do use tonal separation and thin ruled borders for resting surfaces.
- Do preserve formula readability and responsive single-column reading.
- Don't add decorative shadows to ordinary study cards.
- Don't replace the quiet paper/forest system with unrelated saturated colors.

## Mathematics navigation

The desktop rail groups 高数、概率论、线性代数, each with formula/problem counts and direct subfilters. The main content repeats course controls for mobile access, then an underlined formula/problem selector. These are standard buttons with explicit pressed states in the existing forest/leaf palette. The editor shows course and content-type selects for math, and hides/disables those fields for English. Physics has no active navigation or editor option.
