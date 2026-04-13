

## Fix Google Search Results Branding

### Problem
Google is still showing the old Lovable logo in search results 4 days after requesting re-indexing. This is caused by missing SEO signals and incomplete favicon configuration.

### Changes

**1. Fix favicon references in `index.html`**
- Add a `favicon.ico` generated from the existing `favicon.png` (or copy the PNG as a fallback `.ico`)
- Add `sizes` attribute to the icon links for clarity
- Convert OG image and Twitter image URLs to absolute paths using `https://assetlabs.ai`
- Add a canonical `<link rel="canonical">` tag

**2. Add `sitemap.xml` to `public/`**
- Create a basic sitemap listing the main pages with `https://assetlabs.ai` as the base URL
- This helps Google discover and re-crawl pages faster

**3. Update `robots.txt`**
- Add a `Sitemap:` directive pointing to `https://assetlabs.ai/sitemap.xml`

**4. After deployment**
- You should go back to Google Search Console → URL Inspection → enter `https://assetlabs.ai` → click "Request Indexing" one more time after these changes are live

### Technical Details
- The `favicon.png` will be copied to also serve as `favicon.ico` (browsers handle PNG-in-ICO fine)
- All meta tags will use absolute URLs so crawlers can resolve them correctly
- Canonical tag prevents duplicate indexing across URL variants

