# Slide Generation Prompt Template

Use this template as a pre-prompt when generating new slides with the frontend-design skill.
Append the user's content description at the end.

---

Create a standalone HTML presentation slide at exactly 1920×1080px (16:9).

## Technical requirements (MANDATORY — do not deviate)
- `html, body`: `width: 100%; height: 100%; overflow: hidden; margin: 0; padding: 0; background: #ddd; font-family: 'Poppins', sans-serif`
- `.slide`: `width: 1920px; height: 1080px; position: relative; overflow: hidden; transform-origin: top left; display: flex; flex-direction: column`
- NO viewport meta tag
- NO CSS transform or scale on `.slide` in the stylesheet
- NO animations or opacity:0 initial states
- Include the scaling JS at the bottom (centers and scales to fit browser):
```js
function scaleSlide() {
  const slide = document.querySelector('.slide');
  const scaleX = window.innerWidth / 1920;
  const scaleY = window.innerHeight / 1080;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (window.innerWidth - 1920 * scale) / 2;
  const offsetY = (window.innerHeight - 1080 * scale) / 2;
  slide.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}
scaleSlide();
window.addEventListener('resize', scaleSlide);
```

## Design system (Timestamp brand)
- Font: Poppins from Google Fonts (weights 300, 400, 500, 600, 700)
- `--red: #CE0E2D`
- `--bg: #F2F2F2`
- `--white: #FFFFFF`
- `--text: #464646`
- `--text-light: #767677`
- `--text-muted: #888899`

## Typography scale for 1920×1080
- Brand line / small labels: 16px
- Body paragraphs: 16px, line-height 1.8, font-weight 300
- Section labels (uppercase): 16px, letter-spacing 2px, font-weight 600
- Card body text / list items: 17px, line-height 1.75
- Card pill labels: 17px, font-weight 600
- Industry/tag chips: 15px
- Tech chips: 15px, padding 8px 22px
- Stat numbers: 28px, font-weight 700
- Stat labels: 13px
- Project name / main title: 64px, font-weight 700
- Client name: 18px, font-weight 300

## Layout guidance
- Header area: `height: 400px; flex-shrink: 0; padding: 48px 80px 0`
- Cards row: `flex: 1; padding: 32px 80px 0; gap: 28px; min-height: 0`
- Tech bar: `flex-shrink: 0; padding: 28px 80px 36px`
- Card internal padding: `40px 36px`
- Use `flex: 1` on cards-row so it fills all remaining vertical space

## Assets
- Logo: `<img src="timestamp-logo.png">` at height 24px
- Save file to: `public/slides/[filename].html`

---

## User content description:
<!-- The user's slide content goes here -->
