const { db, COLLECTIONS } = require('../config/firebase');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL_NAME = 'gemini-3-flash-preview';

function getLanguageInstruction(lang) {
  return lang === 'ar' ? 'Respond in Arabic only.' : 'Respond in English only.';
}

function normalizeSpaceDoc(doc) {
  const data = doc.data() || {};

  return {
    id: doc.id,
    name: data.name || 'Unnamed space',
    description: data.description || 'No description',
    price: data.price ?? 'N/A',
    location: data.location || null,
  };
}

async function fetchSpacesContext() {
  const snapshot = await db.collection(COLLECTIONS.SPACES).get();

  return snapshot.docs.map(normalizeSpaceDoc);
}

function formatSpacesContext(spaces) {
  if (!spaces.length) {
    return 'No spaces are currently available in the database.';
  }

  return [
    'Spaces:',
    ...spaces.map((space) => {
      const locationText = space.location ? ` | location: ${space.location}` : '';
      return `- ${space.id} | ${space.name} | ${space.description} | ${space.price} ILS${locationText}`;
    }),
  ].join('\n');
}

function buildPrompt({ message, lang, spaces }) {
  const systemInstruction = [
    'You are the official assistant of Masahtak app.',
    'Only answer based on provided spaces data.',
    'Do not answer outside workspace booking domain.',
    'When suggesting a space, append [ACTION:SPACE_ID] using the exact suggested space id.',
    getLanguageInstruction(lang),
  ].join(' ');

  return `${systemInstruction}\n\n${formatSpacesContext(spaces)}\n\nUser question: ${message}`;
}

function addActionTagIfMissing(text, spaces) {
  if (!text || !spaces.length || /\[ACTION:[^\]]+\]/.test(text)) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const matchedSpace = spaces.find((space) => lowerText.includes(space.name.toLowerCase()));

  if (!matchedSpace) {
    return text;
  }

  return `${text} [ACTION:${matchedSpace.id}]`;
}


async function generateConciergeReply({ message, lang }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  // استيراد المكتبة
  const { GoogleGenerativeAI } = require('@google/generative-ai');

  // جلب البيانات من فايربيس
  const spaces = await fetchSpacesContext();

  if (!spaces.length) {
    return {
      text: lang === 'ar' 
        ? 'عذرًا، لا توجد مساحات متاحة حاليًا.' 
        : 'Sorry, there are no available spaces right now.',
    };
  }

  // تعريف المتغير بشكل صحيح
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = buildPrompt({ message, lang, spaces });

  // تنفيذ الطلب
  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text();

  // إضافة التاجات إذا لزم الأمر
  text = addActionTagIfMissing(text, spaces);

  return { text };
}

module.exports = { generateConciergeReply };
