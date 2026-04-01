# Design System Documentation: The Illuminated Gallery

## 1. Overview & Creative North Star
This design system is built upon the "Illuminated Gallery" philosophy. Rather than viewing a dashboard as a utility grid of data, we treat the UI as a curated exhibition where information is elevated through light, depth, and purposeful breathing room.

The "Creative North Star" is **Atmospheric Precision**. We move away from the "boxed-in" feel of traditional SaaS platforms by utilizing intentional asymmetry, overlapping elements, and high-contrast typography scales. The layout should feel like a series of fine-paper sheets or frosted glass panes floating in a sunlit space. We reject the heavy use of lines; instead, we define the world through shifts in light and tonal density.

---

## 2. Colors & Surface Philosophy
The palette utilizes a sophisticated mix of warm primaries (`#9a4000`) and deep, intellectual secondaries (`#4647d3`), anchored by a pristine, airy background (`#f5f7f9`).

### The "No-Line" Rule
Standard 1px borders are a failure of contrast. Within this design system, **explicit 1px solid borders for sectioning are strictly prohibited.** Boundaries must be defined solely through:
- **Tonal Shifts:** Placing a `surface-container-lowest` card on a `surface-container-low` background.
- **Negative Space:** Using the Spacing Scale (`spacing-8` or `spacing-10`) to isolate functional groups.
- **Soft Shadows:** Allowing elevation to imply the edge.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of layers. Use the `surface-container` tiers to create depth:
1. **Base Layer:** `surface` (#f5f7f9) – The "floor" of the application.
2. **Sectioning:** `surface-container-low` (#eef1f3) – Large architectural zones (e.g., sidebars or content backdrops).
3. **Interactive Elements:** `surface-container-lowest` (#ffffff) – This is for cards and primary inputs. The white provides the highest "pop" against the off-white background.

### The "Glass & Gradient" Rule
To capture a premium editorial feel, primary cards or floating action panels should utilize **Glassmorphism**. Apply `surface-container-lowest` at 80% opacity with a `backdrop-filter: blur(20px)`.
**Signature Textures:** For primary CTAs or data-heavy hero cards, use a subtle linear gradient from `primary` (#9a4000) to `primary_container` (#fe8947). This creates a sense of "visual soul" and energy that flat color cannot replicate.

---

## 3. Typography: The Editorial Voice
Typography is the architecture of the interface. We utilize two distinct families to balance personality with technical readability.

* **Headlines & Display (Plus Jakarta Sans):** These are our "Art Director" moments. Use `display-lg` and `headline-lg` with tight letter-spacing to create an authoritative, high-fashion impact.
* **Labels & Metadata (Manrope):** We use Manrope for `label-md` and `label-sm`. Its technical, slightly condensed nature makes it perfect for the "small, interactive cards" requested, ensuring data is legible even at 11px or 12px.

**The Hierarchy Rule:** Use extreme scale differences to guide the eye. A `display-sm` headline should often be paired directly with a `body-sm` description to create a sophisticated, unbalanced aesthetic that feels custom-designed.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** and ambient light, not structural dividers.

* **Ambient Shadows:** For floating elements, use extremely diffused shadows.
* *Value:* `0px 12px 32px`
* *Color:* Use `on-surface` (#2c2f31) at 4% to 6% opacity. This mimics a natural shadow cast in a bright room.
* **The "Ghost Border" Fallback:** If accessibility requirements demand a border (e.g., in high-contrast modes), use the `outline-variant` token (#abadaf) at a maximum of 15% opacity. It should be felt, not seen.
* **Tonal Lift:** Elevate a card on hover by shifting its background from `surface-container-lowest` to `surface-bright`.

---

## 5. Components

### The Gallery Card (Primary Component)
The core of this system is the grid of small, interactive cards.
* **Structure:** `surface-container-lowest` background, `xl` (1.5rem) rounded corners.
* **Accent:** Use a "Light Leak" — a subtle 40px radius radial gradient in the top-right corner of the card using `secondary_container` or `tertiary_container` at 20% opacity.
* **Interaction:** On hover, the card should lift using the Ambient Shadow and scale slightly (1.02x).

### Buttons
* **Primary:** `primary` background with `on_primary` text. `full` (9999px) roundedness for a pill-shaped, modern look.
* **Secondary:** `secondary_container` background with `on_secondary_container` text.
* **Tertiary:** No background. Use `title-sm` typography with a `primary` color and a subtle bottom-padding shift on hover.

### Inputs & Search
* **Field:** `surface-container-low` background, `md` (0.75rem) rounding.
* **State:** When focused, the background shifts to `surface-container-lowest` with a "Ghost Border" of `primary` at 20% opacity.

### Navigation (Sidebar)
* **Active State:** Use a "Floating Indicator"—a `primary_container` pill background with `on_primary_fixed` text. Do not use a vertical line on the edge; use a fully encapsulated pill shape.

---

## 6. Do’s and Don’ts

### Do:
* **Use Asymmetric Spacing:** Give more space to the top of a section than the bottom to create a "pushed down" editorial feel.
* **Leverage vibrant accents:** Use the `tertiary` (#b00d6a) and `secondary` (#4647d3) colors for iconography and data visualizations to create "jewel tones" against the light UI.
* **Embrace white space:** If a grid feels "busy," increase the spacing token (e.g., move from `8` to `12`).

### Don't:
* **Don't use pure black:** Never use `#000000` for text. Use `on_surface` (#2c2f31) to maintain the soft, premium feel.
* **Don't use "Card-in-Card" borders:** If you need to nest a list inside a card, separate the items using `spacing-2` of vertical white space or a very subtle background shift to `surface-container-low`.
* **Don't crowd the edges:** Maintain a minimum padding of `spacing-6` within all cards. Content must have room to breathe.