# Civil Structural Calc — Project Rules

## Site
- Domain: https://civilstrcalc.com
- Host: Netlify (repo root = publish dir)
- Canonical URL format: `https://civilstrcalc.com/pages/<slug>` (no .html extension)

## Yeni sayfa eklerken (zorunlu adımlar)
Her yeni `.html` sayfası oluşturulduğunda şunlar yapılmalı — hiç biri atlanmaz:

1. `<head>` içine canonical tag ekle:
   ```html
   <link rel="canonical" href="https://civilstrcalc.com/pages/<slug>">
   ```
2. `<head>` içine robots meta ekle:
   ```html
   <meta name="robots" content="index, follow">
   ```
3. `sitemap.xml` dosyasına URL ve bugünün tarihi ile giriş ekle:
   ```xml
   <url>
     <loc>https://civilstrcalc.com/pages/<slug></loc>
     <lastmod>YYYY-MM-DD</lastmod>
     <changefreq>monthly</changefreq>
     <priority>0.8</priority>
   </url>
   ```
4. `_redirects` dosyasına `.html` redirect eklemeye **gerek yok** — wildcard kural zaten tüm `/pages/*.html → /pages/:splat` yönlendirmelerini karşılıyor.

## Paylaşılan profil verisi
`js/steel-profiles.js` — tüm çelik kesit veritabanı burada. Yeni steel modülleri bu dosyayı `<script src="../js/steel-profiles.js">` ile yükler, `window.SteelProfiles` global'ini kullanır.

## Deploy
Her değişiklik sonrası commit + push → Netlify otomatik deploy eder. Kullanıcı onayı bekleme.
