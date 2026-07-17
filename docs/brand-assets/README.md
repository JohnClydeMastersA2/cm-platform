# CM Platform Brand Assets

## Primary colors

- Deep Indigo: `#1E1B4B`
- Indigo: `#4F46E5`
- Lavender: `#818CF8`
- Light Indigo: `#C7D2FE`
- Soft Gray: `#F5F6FF`

## Website favicon setup

Copy the contents of `favicon/` into your public/static assets folder.

Add these tags inside the page `<head>`:

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#4F46E5">
```

For a Vite application, place the favicon files in the app's `public/` directory.

## Logo use

- Use `svg/cmplatform-logo-horizontal.svg` in website headers.
- Use `svg/cmplatform-logo-vertical.svg` in documents or square layouts.
- Use `svg/cmplatform-icon.svg` for standalone symbol use.
- Use `svg/cmplatform-app-icon.svg` for app-icon generation.

The SVG artwork is the primary source. PNG and ICO files are exports.
