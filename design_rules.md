# Ladara Design Rules

Use this document as the visual and interaction source of truth for Ladara. Apply these rules to every new or modified Angular surface. A more specific, approved surface brief may override a rule; document that exception in the implementation.

Treat functional truth, accessibility, and product-specific content as non-negotiable. Preserve the existing token names and component patterns unless the task explicitly requires a system change.

## 1. Design Philosophy & Visual Identity

- Design for repeat medical procurement first; treat brand reassurance as support for the purchasing task.
- Make catalog discovery, availability, pricing, and fulfillment confidence visible in the first viewport.
- Preserve Ladara's lime-and-violet identity, medical subject matter, and professional B2B tone.
- Use a clear hierarchy: brand and task context, search and filters, procurement-ready product information, then secondary reassurance.
- Make every prominent action truthful. Implement its destination and outcome before displaying it.
- Use Spanish consistently throughout the customer-facing interface. Do not mix English labels into Spanish workflows.
- Prefer product-specific content and imagery over generic healthcare or e-commerce patterns.
- Keep the interface calm, precise, trustworthy, and efficient. Do not let decorative hero content compete with catalog actions.

## 2. Layout & Spacing Rules

- Use the existing 8px base scale: `4px`, `8px`, `16px`, `24px`, `32px`, and `80px` for large desktop section spacing.
- Use a centered content container with a maximum width of `1200px` and responsive horizontal padding of `24px` on desktop and `15px` on small screens.
- Align headers, hero content, search controls, filters, product grids, and pagination to the same container edges.
- Use CSS Grid for product collections and repeated feature groups; use Flexbox for toolbars, card action rows, and inline control groups.
- Keep product cards equal-width within a row and prevent card content from changing the grid geometry.
- Use a minimum product-card width of `280px` on desktop and one column below `480px`.
- Use the existing responsive thresholds deliberately: `992px` for tablet composition, `768px` for mobile layout changes, and `480px` for compact controls.
- At `768px` and below, target `.sticky-header` and make navigation/actions compact without wrapping or crowding.
- At `768px` and below, expose search and category controls before lengthy reassurance content.
- Keep the hero compact enough for the catalog to begin within the first viewport; never require a long scroll through hero and feature content before search.
- Preserve `body` width equal to the viewport. Prevent horizontal overflow at every breakpoint.
- Keep interactive touch targets at least `44px` in both dimensions, especially buttons, filter options, quantity controls, and pagination.
- Do not use malformed or arbitrary CSS values such as `1var(--spacing-sm)` or `5var(--radius-lg)`; use valid tokens or explicit values.

## 3. Typography & Hierarchy

- Use `Poppins` for headings and `Inter` for body and UI text through the existing font variables.
- Use the existing font tokens: `--font-heading`, `--font-body`, and `--font-ui`; do not hardcode a different font family per component.
- Use the established type hierarchy: hero heading `2.75rem` desktop and `2.4rem` tablet, product names `1.35rem`, and body text between `0.9rem` and `1.25rem` according to context.
- Use `font-weight: 700` for headings, `600-700` for primary actions and prices, and `400-500` for supporting text and controls.
- Maintain line heights of `1.2` for headings and `1.5` for body copy.
- Use `--color-secondary-dark` for readable body text and reserve violet for headings, links, selected states, and brand emphasis.
- Maintain strong contrast for text, controls, focus indicators, and disabled states. Never communicate status by color alone.
- Keep button labels and headings in sentence case unless an existing brand treatment explicitly requires uppercase. Do not mix casing patterns without purpose.
- Do not introduce another dominant font or generic display typeface without an approved brand decision; avoid making `Inter` the only visual voice.

## 4. Color System & Surface Architecture

- Use the existing tokens instead of raw color values:
  - Primary lime: `--color-primary-lime`; hover: `--color-primary-lime-hover`.
  - Primary violet: `--color-primary-violet`; hover: `--color-primary-violet-hover`.
  - Text: `--color-secondary-dark`.
  - Light surface: `--color-secondary-light`.
  - Border: `--color-secondary-border`.
  - Semantic status: `--color-success`, `--color-warning`, and `--color-error`.
- Use lime for primary purchase actions, positive emphasis, and selected brand accents.
- Use violet for secondary actions, navigation emphasis, headings, active pagination, and focused brand states.
- Keep primary actions visually dominant over secondary and ghost actions. Do not style competing actions with equal emphasis.
- Use white or light-gray surfaces for product cards, search controls, dropdowns, and readable content areas.
- Use borders and the existing shadow tokens to establish elevation. Keep card boundaries clear without stacking cards inside cards.
- Use `--radius-sm`, `--radius-md`, and `--radius-lg`; keep repeated cards at modest radii and do not introduce arbitrary `24px` rounding without a deliberate surface decision.
- Use a light, professional default theme. Any dark mode must define equivalent contrast-safe tokens for every surface, text, border, focus, and semantic state before shipping.
- Keep status colors meaningful: distinguish loading, success, warning, error, unavailable, and empty states.

## 5. Component & Interactive States

- Implement loading UI whenever data is loading. Use stable skeletons or reserved layout space so content does not jump.
- Separate API errors from valid empty results. Provide a clear Spanish error message, a retry action, and a distinct no-results state that helps users adjust filters.
- Show product availability, stock constraints, SKU, brand, unit or pack size, price, and delivery expectation whenever the data exists.
- Use real product imagery. Provide a valid, product-appropriate fallback image and preserve packaging details with `object-fit: contain` where inspection matters.
- Use semantic HTML for controls: native buttons, links, inputs, selects, and menu/listbox patterns. Never make a clickable `div` the only way to select a category.
- Expose selected, expanded, disabled, busy, and pressed states through both visual styling and appropriate ARIA attributes.
- Give every action feedback that persists long enough to understand and leaves the current task state visible. Do not rely only on transient modals for cart status.
- Keep cart state visible, including a persistent item count or equivalent confirmation after adding an item.
- Implement wishlist behavior and selected state before showing a wishlist button; otherwise remove the control.
- Make quantity controls keyboard accessible, constrained to valid bounds, and accompanied by clear labels and availability feedback.
- Use the existing button variants consistently: lime primary, violet outlined secondary, and restrained ghost actions.
- Provide visible `:focus-visible` states using the shared focus treatment. Never remove outlines without an equally visible replacement.
- Use hover, active, and disabled states that do not resize or shift surrounding content.
- Use `0.2s ease` transitions only for purposeful state changes. Prefer opacity, color, and small positional changes; do not animate layout dimensions.
- Respect `prefers-reduced-motion: reduce` and disable parallax, bounce, elastic easing, and nonessential animation for users who request reduced motion.
- Keep pagination, page-size choices, filters, sorting, and search synchronized with visible results. Announce loading, result-count, error, and success updates to assistive technology.

## 6. Strict "DO NOT" List

- Do not ship an empty or broken `<img>` source, placeholder catalog data, generic product names, or an unrelated fallback image.
- Do not render a prominent CTA that has no implemented behavior, destination, or clear outcome.
- Do not show API failures as “no products found.”
- Do not place a tall hero and feature stack ahead of the primary catalog workflow on mobile or desktop.
- Do not hide search, category filtering, or availability behind unnecessary scrolling or decorative interaction.
- Do not use clickable `div` elements for category selection or other keyboard-relevant controls.
- Do not add inert wishlist buttons, fake stock indicators, or feedback that claims success before the operation succeeds.
- Do not omit SKU, brand, pack/unit information, availability, or fulfillment details when those fields are available to the component.
- Do not mix Spanish and English labels, messages, filters, or empty states.
- Do not use `object-fit: cover` when it crops medical packaging or prevents product inspection.
- Do not use elastic, bounce, or attention-seeking animation for ordinary shopping interactions.
- Do not make `Inter` the undifferentiated visual treatment for every element; preserve heading/body contrast with the approved type system.
- Do not create horizontal overflow, wrapped header actions, undersized touch targets, or controls that collide at `768px` and `480px`.
- Do not use arbitrary hardcoded colors, spacing, radii, shadows, malformed `var()` expressions, or duplicated component rules when a shared token exists.
- Do not create nested cards, excessive decorative surfaces, or visual treatments that compete with product discovery.
- Do not remove focus indicators, rely on color alone for state, or ship controls without accessible names and selected/disabled semantics.