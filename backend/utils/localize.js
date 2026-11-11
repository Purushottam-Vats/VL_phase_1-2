// Language helpers. English is the base language; other languages override field-by-field,
// so partially translated content still renders completely (falls back to English).
const LANGS = ['en', 'kn', 'hi'];

function plain(doc) {
  return doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
}

function isFilled(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function localizeContent(content, lang = 'en') {
  const c = plain(content) || {};
  const base = c.en || {};
  if (lang === 'en' || !c[lang]) return { ...base };
  const out = { ...base };
  for (const [k, v] of Object.entries(c[lang])) if (isFilled(v)) out[k] = v;
  return out;
}

function translatedLanguages(content) {
  const c = plain(content) || {};
  return LANGS.filter((l) => c[l] && Object.values(c[l]).some(isFilled));
}

// For {en, kn, hi} string maps (e.g. subject names).
function localizeMap(map, lang = 'en') {
  const m = plain(map) || {};
  return isFilled(m[lang]) ? m[lang] : m.en;
}

module.exports = { LANGS, localizeContent, localizeMap, translatedLanguages };
