// THE ONE BOUNDARY BETWEEN MEASUREMENT AND READING.
//
// A FACET is exhaustive and mutually exclusive: every palette resolves to exactly one value, so a
// facet can carry navigation. A TAG is sparse and overlapping: it describes, it does not partition.
// taxonomy/vocabulary.json states that distinction; this module is the runtime half of it.
//
// The words below were tags once, and every one of them is now a facet value — Warm is Temperature,
// Dark is Lightness, Stark is Contrast. While they were both, the filter panel offered the same
// visible word in two dimensions with two meanings: selecting the measured Temperature → Warm still
// left an interpretive `warm` trait on offer for the palettes that survived. That is not a wording
// problem and cannot be fixed with a help note; the term has to leave one of the two systems.
//
// Three paths can put a descriptor on a palette, so all three read this list:
//   · the local reading engine  — reading.js no longer composes from the measured axes at all
//   · the live reading          — interpret.js parseInterp filters what the model returns
//   · anything already stored   — persistence.js validateFeed filters on read, so an archive
//                                 written before this change comes back clean with no migration
//                                 step and no SCHEMA_VERSION move
//
// scripts/taxonomy-check.mjs asserts this list matches taxonomy/vocabulary.json's `retired` block
// exactly, in both directions — the artifact is the record, this is the enforcement, and they are
// only worth having separately if something proves they agree.

const RETIRED = [
  // retired.computed — the term became a facet value
  'warm', 'cool', 'neutral',
  'dark', 'low-lit', 'even', 'bright', 'pale',
  'achromatic', 'muted', 'restrained', 'saturated', 'vivid',
  'flat', 'gentle', 'structured', 'stark',
  'monochrome', 'harmonious', 'varied', 'opposed',
  'anchored', 'paired', 'balanced', 'graded',
  // retired.synonym — the term competed with a canonical form and split counts
  'cold', 'desaturated', 'soft', 'pastel',
];

export const RETIRED_DESCRIPTORS = new Set(RETIRED);

// A term is retired on its WORD, not its casing: the same descriptor is stored 'Warm', matched
// 'warm' by the facet, and spoken 'warm' by the row's accessible name.
export function isRetiredDescriptor(d) {
  return typeof d === 'string' && RETIRED_DESCRIPTORS.has(d.trim().toLowerCase());
}

// Filter, never rewrite. `retired.computed` records where each term's meaning now lives, so nothing
// is lost by dropping it: the palette still answers Temperature → Warm, from the pixels, at full
// precision. Rewriting 'Warm' into some other tag would invent a reading nobody made.
export function withoutRetired(descriptors) {
  return (descriptors || []).filter((d) => typeof d === 'string' && d.trim() && !isRetiredDescriptor(d));
}
