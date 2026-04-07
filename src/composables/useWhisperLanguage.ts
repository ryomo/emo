/** Whisper-supported language names (as expected by the pipeline API) */
export const WHISPER_LANGUAGES = [
  'afrikaans', 'albanian', 'amharic', 'arabic', 'armenian', 'assamese',
  'azerbaijani', 'bashkir', 'basque', 'belarusian', 'bengali', 'bosnian',
  'breton', 'bulgarian', 'burmese', 'catalan', 'chinese', 'croatian',
  'czech', 'danish', 'dutch', 'english', 'estonian', 'faroese',
  'finnish', 'french', 'galician', 'georgian', 'german', 'greek',
  'gujarati', 'haitian creole', 'hausa', 'hawaiian', 'hebrew', 'hindi',
  'hungarian', 'icelandic', 'indonesian', 'italian', 'japanese', 'javanese',
  'kannada', 'kazakh', 'khmer', 'korean', 'lao', 'latin',
  'latvian', 'lingala', 'lithuanian', 'luxembourgish', 'macedonian', 'malagasy',
  'malay', 'malayalam', 'maltese', 'maori', 'marathi', 'mongolian',
  'myanmar', 'nepali', 'norwegian', 'nynorsk', 'occitan', 'pashto',
  'persian', 'polish', 'portuguese', 'punjabi', 'romanian', 'russian',
  'sanskrit', 'serbian', 'shona', 'sindhi', 'sinhala', 'slovak',
  'slovenian', 'somali', 'spanish', 'sundanese', 'swahili', 'swedish',
  'tagalog', 'tajik', 'tamil', 'tatar', 'telugu', 'thai',
  'tibetan', 'turkish', 'turkmen', 'ukrainian', 'urdu', 'uzbek',
  'vietnamese', 'welsh', 'yiddish', 'yoruba',
] as const

/** Map BCP 47 primary subtag to Whisper language name */
const LOCALE_TO_WHISPER: Record<string, string> = {
  af: 'afrikaans', sq: 'albanian', am: 'amharic', ar: 'arabic',
  hy: 'armenian', as: 'assamese', az: 'azerbaijani', ba: 'bashkir',
  eu: 'basque', be: 'belarusian', bn: 'bengali', bs: 'bosnian',
  br: 'breton', bg: 'bulgarian', my: 'myanmar', ca: 'catalan',
  zh: 'chinese', hr: 'croatian', cs: 'czech', da: 'danish',
  nl: 'dutch', en: 'english', et: 'estonian', fo: 'faroese',
  fi: 'finnish', fr: 'french', gl: 'galician', ka: 'georgian',
  de: 'german', el: 'greek', gu: 'gujarati', ht: 'haitian creole',
  ha: 'hausa', haw: 'hawaiian', he: 'hebrew', hi: 'hindi',
  hu: 'hungarian', is: 'icelandic', id: 'indonesian', it: 'italian',
  ja: 'japanese', jw: 'javanese', kn: 'kannada', kk: 'kazakh',
  km: 'khmer', ko: 'korean', lo: 'lao', la: 'latin',
  lv: 'latvian', ln: 'lingala', lt: 'lithuanian', lb: 'luxembourgish',
  mk: 'macedonian', mg: 'malagasy', ms: 'malay', ml: 'malayalam',
  mt: 'maltese', mi: 'maori', mr: 'marathi', mn: 'mongolian',
  ne: 'nepali', no: 'norwegian', nn: 'nynorsk', oc: 'occitan',
  ps: 'pashto', fa: 'persian', pl: 'polish', pt: 'portuguese',
  pa: 'punjabi', ro: 'romanian', ru: 'russian', sa: 'sanskrit',
  sr: 'serbian', sn: 'shona', sd: 'sindhi', si: 'sinhala',
  sk: 'slovak', sl: 'slovenian', so: 'somali', es: 'spanish',
  su: 'sundanese', sw: 'swahili', sv: 'swedish', tl: 'tagalog',
  tg: 'tajik', ta: 'tamil', tt: 'tatar', te: 'telugu',
  th: 'thai', bo: 'tibetan', tr: 'turkish', tk: 'turkmen',
  uk: 'ukrainian', ur: 'urdu', uz: 'uzbek', vi: 'vietnamese',
  cy: 'welsh', yi: 'yiddish', yo: 'yoruba',
}

/** Detect the user's language from the browser environment, mapped to a Whisper-compatible name. */
export function detectBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return 'english'
  const tag = navigator.language?.split('-')[0]?.toLowerCase() ?? ''
  return LOCALE_TO_WHISPER[tag] ?? 'english'
}
