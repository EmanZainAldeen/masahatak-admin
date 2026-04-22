const { GoogleGenerativeAI } = require('@google/generative-ai');
const { db, COLLECTIONS } = require('../config/firebase');

const MODEL_NAME = 'gemini-1.5-pro';

function getLanguageInstruction(lang) {
  if (lang === 'ar') return 'Respond in Arabic only.';
  if (lang === 'en') return 'Respond in English only.';
  return 'Always respond in the same language used by the user.';
}

function normalizeSpaceDoc(doc) {
  const data = doc.data() || {};

  return {
    id: doc.id,
    name: data.name || 'Unnamed space',
    description: data.description || 'No description',
    key_features: data.key_features || [],
    price: data.price ?? 'N/A',
    location: data.location || null,
    smart_summary: data.smart_summary || '',
  };
}

// خوارزمية المقارنة: تفضيل النتائج المتقاطعة مع آخر نتائج عُرضت للمستخدم
function getRefinedSpaces(oldSpaces, newSpaces) {
  if (!oldSpaces || oldSpaces.length === 0) return newSpaces;

  const oldIds = new Set(oldSpaces.map((s) => s.id));
  const intersection = newSpaces.filter((space) => oldIds.has(space.id));

  return intersection.length >= 3 ? intersection : newSpaces;
}

function formatSpacesContext(spaces) {
  if (!spaces.length) {
    return 'No spaces are currently available in the database.';
  }

  return [
    'Spaces:',
    ...spaces.map((space) => {
      const locationText = space.location ? ` | location: ${space.location}` : '';
      const featuresText = Array.isArray(space.key_features) && space.key_features.length
        ? ` | features: ${space.key_features.join(', ')}`
        : '';

      return `- ${space.id} | ${space.name} | ${space.description} | ${space.price} ILS${locationText}${featuresText}`;
    }),
  ].join('\n');
}

function buildPrompt({ message, lang, spaces, userSummary }) {
  const systemInstruction = [
    'You are the official assistant of Masahtak app.',
    'Only answer based on provided spaces data.',
    'Do not invent information.',
    'If no match, apologize politely.',
    'Do not answer outside workspace booking domain.',
    'When suggesting a space, append [ACTION:SPACE_ID] using the exact suggested space id.',
    getLanguageInstruction(lang),
  ].join(' ');

  return [
    systemInstruction,
    '',
    `User profile summary: ${userSummary || 'No previous summary available.'}`,
    '',
    formatSpacesContext(spaces),
    '',
    `User question: ${message}`,
  ].join('\n');
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

async function fetchSpacesFromDB() {
  const snapshot = await db.collection(COLLECTIONS.SPACES).limit(20).get();
  return snapshot.docs.map(normalizeSpaceDoc);
}

async function generateConciergeReply({ userId, message, lang, history = [], lastSpaces = [] }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  try {
    const userSummary = userId
      ? ((await db.collection(COLLECTIONS.USERS).doc(userId).get()).data() || {}).ai_profile_summary || ''
      : '';

    const newFetchedSpaces = await fetchSpacesFromDB();
    const finalSpacesList = getRefinedSpaces(lastSpaces, newFetchedSpaces);

    if (!finalSpacesList.length) {
      return {
        text: lang === 'ar' ? 'عذرًا، لا توجد مساحات متاحة حاليًا.' : 'Sorry, there are no available spaces right now.',
        currentSpaces: [],
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = buildPrompt({
      message,
      lang,
      spaces: finalSpacesList,
      userSummary,
    });

    // حل تعارض: لو history متوفر نستخدم محادثة مستمرة، وإلا توليد مباشر
    let rawText = '';
    if (history.length) {
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(prompt);
      rawText = result?.response?.text?.() || '';
    } else {
      const result = await model.generateContent(prompt);
      rawText = result?.response?.text?.() || '';
    }

    return {
      text: addActionTagIfMissing(rawText.trim(), finalSpacesList),
      currentSpaces: finalSpacesList,
    };
  } catch (error) {
    console.error('Concierge Error:', error);
    return {
      text: lang === 'ar' ? 'عذراً، حدث خطأ ما.' : 'Sorry, an error occurred.',
      currentSpaces: [],
    };
  }
}

async function finalizeUserSession({ userId, history }) {
  try {
    if (!history || history.length === 0) return;

    const conversationSummaryPrompt = `
Based on this conversation, update the user's workspace preferences profile in 2 short sentences.
Conversation:
${history.map((h) => `${h.role}: ${h.parts?.[0]?.text || ''}`).join('\n')}
`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(conversationSummaryPrompt);
    const newSummary = result?.response?.text?.() || '';

    await db.collection(COLLECTIONS.USERS).doc(userId).update({
      ai_profile_summary: newSummary,
      last_updated: new Date(),
    });
  } catch (error) {
    console.error('Summary Update Error:', error);
  }
}

module.exports = {
  generateConciergeReply,
  finalizeUserSession,
};
