import { useEffect } from 'react';

const SITE_URL = 'https://wangs.in';
const DEFAULT_TITLE = 'Wangs | Authentic Regional Pickles & Foods from India';
const DEFAULT_DESCRIPTION =
  'Discover authentic Naga pickles and regional food products at Wangs. Explore traditional flavours from independent food makers across India.';
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
}) {
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
  }, [title, description, canonicalPath, image, ogType, robots]);

  return null;
}
