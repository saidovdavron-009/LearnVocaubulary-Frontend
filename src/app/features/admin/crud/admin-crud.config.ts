/** Admin CRUD sahifalari konfiguratsiyasi: har bir resurs uchun ustunlar va forma maydonlari (Swagger DTO'lariga mos). */

export type ColumnType = 'text' | 'strong' | 'tag' | 'bool' | 'number' | 'date';
export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'categories';
/** Dinamik variantlar manbai. */
export type OptionsSource = 'languages' | 'cefr' | 'pos' | 'conditions' | 'parentCategories';

export interface CrudColumn {
  key: string;
  label: string;
  type: ColumnType;
}

export interface CrudField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: OptionsSource;
  placeholder?: string;
  /** Faqat yaratishda ko'rinadi (masalan, so'zning birinchi tarjimasi). */
  createOnly?: boolean;
  hint?: string;
}

export interface CrudConfig {
  title: string;
  subtitle: string;
  /** Masalan "/admin/words". */
  endpoint: string;
  singular: string;
  columns: CrudColumn[];
  fields: CrudField[];
  defaults: Record<string, unknown>;
}

const CEFR = { key: 'cefrLevel', label: 'Daraja', type: 'select', options: 'cefr' } as const;
const LANGUAGE = { key: 'languageId', label: 'Til', type: 'select', options: 'languages', required: true } as const;

export const CRUD_CONFIGS: Record<string, CrudConfig> = {
  words: {
    title: "So'zlar",
    subtitle: "Lug'atdagi barcha so'zlar: tarjima, daraja, turkum",
    endpoint: '/admin/words',
    singular: "so'z",
    columns: [
      { key: 'text', label: "So'z", type: 'strong' },
      { key: 'primaryTranslation', label: 'Tarjima', type: 'text' },
      { key: 'languageCode', label: 'Til', type: 'tag' },
      { key: 'cefrLevel', label: 'Daraja', type: 'tag' },
      { key: 'partOfSpeech', label: 'Turkum', type: 'text' },
      { key: 'isPublished', label: 'Nashr', type: 'bool' },
      { key: 'createdAt', label: "Qo'shilgan", type: 'date' },
    ],
    fields: [
      LANGUAGE,
      { key: 'text', label: "So'z", type: 'text', required: true, placeholder: 'brave' },
      { key: 'transcription', label: 'Transkripsiya', type: 'text', placeholder: '/breɪv/' },
      { key: 'partOfSpeech', label: "So'z turkumi", type: 'select', options: 'pos' },
      // So'z qaysi darajaga oidligi majburiy: o'quvchilarga so'zlar daraja bo'yicha beriladi.
      { ...CEFR, label: 'Daraja (A1–C2)', required: true },
      { key: 'frequencyRank', label: 'Chastota o‘rni', type: 'number' },
      { key: 'audioUrl', label: 'Audio URL', type: 'text' },
      { key: 'imageUrl', label: 'Rasm URL', type: 'text' },
      { key: 'translation', label: "Tarjima (o'zbekcha)", type: 'text', createOnly: true, placeholder: 'jasur' },
      { key: 'example', label: 'Misol gap', type: 'text', createOnly: true, placeholder: 'She was brave enough...' },
      { key: 'exampleTranslation', label: 'Misol tarjimasi', type: 'text', createOnly: true },
      { key: 'categoryIds', label: 'Mavzular', type: 'categories' },
      { key: 'isPublished', label: 'Nashr qilingan', type: 'checkbox' },
    ],
    defaults: { isPublished: true, categoryIds: [] },
  },
  decks: {
    title: "To'plamlar",
    subtitle: "Tizim to'plamlari va userlar yaratgan to'plamlar",
    endpoint: '/admin/decks',
    singular: "to'plam",
    columns: [
      { key: 'title', label: 'Nomi', type: 'strong' },
      { key: 'languageCode', label: 'Til', type: 'tag' },
      { key: 'cefrLevel', label: 'Daraja', type: 'tag' },
      { key: 'ownerUsername', label: 'Egasi', type: 'text' },
      { key: 'wordsCount', label: "So'zlar", type: 'number' },
      { key: 'learnersCount', label: "O'rganuvchilar", type: 'number' },
      { key: 'isPublic', label: 'Ommaviy', type: 'bool' },
    ],
    fields: [
      LANGUAGE,
      { key: 'title', label: 'Nomi', type: 'text', required: true },
      { key: 'description', label: 'Tavsif', type: 'textarea' },
      CEFR,
      { key: 'coverUrl', label: 'Muqova URL', type: 'text' },
      { key: 'isPublic', label: 'Ommaviy', type: 'checkbox' },
    ],
    defaults: { isPublic: true },
  },
  categories: {
    title: 'Kategoriyalar',
    subtitle: "So'zlar mavzulari (ichma-ich bo'lishi mumkin)",
    endpoint: '/admin/categories',
    singular: 'kategoriya',
    columns: [
      { key: 'name', label: 'Nomi', type: 'strong' },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'icon', label: 'Ikonka', type: 'text' },
      { key: 'wordsCount', label: "So'zlar", type: 'number' },
      { key: 'childrenCount', label: 'Ichki', type: 'number' },
      { key: 'sortOrder', label: 'Tartib', type: 'number' },
    ],
    fields: [
      { key: 'name', label: 'Nomi', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', required: true, placeholder: 'sayohat', hint: 'Kichik lotin harflari va chiziqcha' },
      { key: 'parentId', label: 'Ota kategoriya', type: 'select', options: 'parentCategories' },
      { key: 'icon', label: 'Ikonka', type: 'text', placeholder: 'plane' },
      { key: 'sortOrder', label: 'Tartib', type: 'number' },
    ],
    defaults: { sortOrder: 0 },
  },
  achievements: {
    title: 'Yutuqlar',
    subtitle: 'Gamifikatsiya: shart bajarilganda beriladigan yutuqlar',
    endpoint: '/admin/achievements',
    singular: 'yutuq',
    columns: [
      { key: 'title', label: 'Nomi', type: 'strong' },
      { key: 'code', label: 'Kod', type: 'text' },
      { key: 'conditionType', label: 'Shart', type: 'tag' },
      { key: 'conditionValue', label: 'Qiymat', type: 'number' },
      { key: 'xpReward', label: 'XP', type: 'number' },
      { key: 'earnedCount', label: 'Olganlar', type: 'number' },
    ],
    fields: [
      { key: 'code', label: 'Kod', type: 'text', required: true, placeholder: 'streak_7' },
      { key: 'title', label: 'Nomi', type: 'text', required: true },
      { key: 'description', label: 'Tavsif', type: 'textarea' },
      { key: 'conditionType', label: 'Shart turi', type: 'select', options: 'conditions', required: true },
      { key: 'conditionValue', label: 'Shart qiymati', type: 'number', required: true },
      { key: 'xpReward', label: 'XP mukofoti', type: 'number', required: true },
      { key: 'iconUrl', label: 'Ikonka URL', type: 'text' },
    ],
    defaults: { xpReward: 50, conditionValue: 10, conditionType: 'words_learned' },
  },
  languages: {
    title: 'Tillar',
    subtitle: "O'rganiladigan va ona tillari",
    endpoint: '/admin/languages',
    singular: 'til',
    columns: [
      { key: 'name', label: 'Nomi', type: 'strong' },
      { key: 'code', label: 'Kod', type: 'tag' },
      { key: 'nativeName', label: "O'z tilida", type: 'text' },
      { key: 'isActive', label: 'Faol', type: 'bool' },
    ],
    fields: [
      { key: 'code', label: 'Kod', type: 'text', required: true, placeholder: 'en' },
      { key: 'name', label: 'Nomi', type: 'text', required: true, placeholder: 'English' },
      { key: 'nativeName', label: "O'z tilidagi nomi", type: 'text' },
      { key: 'isActive', label: 'Faol', type: 'checkbox' },
    ],
    defaults: { isActive: true },
  },
};

export const CEFR_OPTIONS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].map((v) => ({ value: v, label: v.toUpperCase() }));
export const POS_OPTIONS = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection', 'phrase', 'idiom'].map(
  (v) => ({ value: v, label: v }),
);
export const CONDITION_OPTIONS = [
  { value: 'words_learned', label: "O'zlashtirilgan so'zlar" },
  { value: 'streak_days', label: 'Seriya (kun)' },
  { value: 'total_reviews', label: 'Takrorlashlar soni' },
];
