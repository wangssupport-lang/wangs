import { useEffect } from 'react';

const SITE_URL = 'https://wangs.in';
const DEFAULT_TITLE = 'Wangs | Authentic Regional Pickles & Foods from Nagaland, India';
const DEFAULT_DESCRIPTION =
  'Wangs is an online regional food marketplace from Nagaland, India, connecting customers with authentic Naga pickles and traditional food products from independent makers.';
const DEFAULT_IMAGE = `${SITE_URL}/hero-pickle-artisan.jpg`;

function upsertMeta(attrName, attrValue, content) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export default function SeoHead({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '/',
  image = DEFAULT_IMAGE,
  ogType = 'website',
  robots = 'index, follow',
  structuredData = null,
}) {
  const structuredJson = structuredData ? JSON.stringify(structuredData) : '';

  useEffect(() => {
    const cleanPath = canonicalPath.startsWith('http')
      ? canonicalPath
      : `${SITE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
    const resolvedImage = image && image.startsWith('http')
      ? image
      : `${SITE_URL}${image ? (image.startsWith('/') ? image : `/${image}`) : '/hero-pickle-artisan.jpg'}`;

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', robots);
    upsertLink('canonical', cleanPath);

    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:site_name', 'Wangs');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', cleanPath);
    upsertMeta('property', 'og:image', resolvedImage);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', resolvedImage);

    const existingScript = document.head.querySelector('script[data-seo-head="true"]');
    if (structuredJson) {
      const scriptEl = existingScript || document.createElement('script');
      scriptEl.setAttribute('type', 'application/ld+json');
      scriptEl.setAttribute('data-seo-head', 'true');
      scriptEl.textContent = structuredJson;
      if (!existingScript) {
        document.head.appendChild(scriptEl);
      }
    } else if (existingScript) {
      existingScript.remove();
    }

    return () => {
      const stale = document.head.querySelector('script[data-seo-head="true"]');
      if (stale) stale.remove();
    };
  }, [title, description, canonicalPath, image, ogType, robots, structuredJson]);

  return null;
}
