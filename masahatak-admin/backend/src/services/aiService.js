<<<<<<< HEAD
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { db, COLLECTIONS } = require('../config/firebase');

const MODEL_NAME = 'gemini-3-flash-preview';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * خوارزمية المقارنة والفلترة (أمون لوجيك)
 */
function getRefinedSpaces(oldSpaces, newSpaces) {
    if (!oldSpaces || oldSpaces.length === 0) return newSpaces;
    const oldIds = new Set(oldSpaces.map(s => s.id));
    const intersection = newSpaces.filter(space => oldIds.has(space.id));
    return intersection.length >= 3 ? intersection : newSpaces;
}

/**
 * بناء تعليمات النظام الأساسية - بدون تمرير متغير لغة
 */
function buildSystemInstruction(totalSpaces, userSummary) {
    return `
    You are the "Masahtak" Smart Assistant for workspaces in Gaza.
    
    STRICT RULE: Always respond in the SAME LANGUAGE the user uses. 
    - If the user speaks Arabic, respond in Arabic.
    - If the user speaks English, respond in English.

    USER CONTEXT (Previous Knowledge):
    ${userSummary || "No previous summary available."}

    STRATEGY:
    1. Guide the user through a friendly conversation to refine their current needs.
    2. You have a list of ${totalSpaces} potential spaces to suggest from.
    3. Goal: Lead them to the absolute BEST single match.
    4. FINAL STAGE: 
       - Suggest the top match with [ACTION:SPACE_ID].
       - Mention 2nd and 3rd options by name ONLY as alternatives.

    TONE: Helpful, professional, and empathetic.
    `;
}

/**
 * الدالة الرئيسية لتوليد الرد
 */
async function generateConciergeReply({ userId, message, history = [], lastSpaces = [] }) {
    try {
        // 1. جلب ملخص المستخدم (تفضيلاته التاريخية)
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
        const userSummary = userDoc.exists ? userDoc.data().ai_profile_summary : "";

        // 2. جلب وتصفية المساحات (الـ 3 ضد الـ 10)
        const newFetchedSpaces = await fetchSpacesFromDB(message); 
        const finalSpacesList = getRefinedSpaces(lastSpaces, newFetchedSpaces);

        // 3. تهيئة الموديل بالتعليمات (الموديل سيكتشف اللغة من الرسالة)
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: buildSystemInstruction(finalSpacesList.length, userSummary)
        });

        const chat = model.startChat({ history });

        // 4. تجهيز البيانات (Metadata) بشكل مختصر
        const contextData = finalSpacesList.map(s => ({
            id: s.id,
            name: s.name,
            features: s.key_features,
            price: s.price,
            summary: s.smart_summary || "No summary"
        }));

        const fullPrompt = `Available Spaces Data: ${JSON.stringify(contextData)}\nUser says: ${message}`;
        const result = await chat.sendMessage(fullPrompt);
        
        return {
            text: result.response.text(),
            currentSpaces: finalSpacesList
        };
    } catch (error) {
        console.error("Concierge Error:", error);
        return { text: "عذراً، حدث خطأ ما. / Sorry, an error occurred." };
    }
}

/**
 * تحديث ملخص المستخدم عند نهاية الجلسة
 */
async function finalizeUserSession({ userId, history }) {
    try {
        if (!history || history.length === 0) return;

        const conversationSummaryPrompt = `
            Based on this conversation, update the user's workspace preferences profile in 2 short sentences.
            Conversation:
            ${history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}
        `;

        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent(conversationSummaryPrompt);
        const newSummary = result.response.text();

        await db.collection(COLLECTIONS.USERS).doc(userId).update({
            ai_profile_summary: newSummary,
            last_updated: new Date()
        });
    } catch (error) {
        console.error("Summary Update Error:", error);
    }
}

async function fetchSpacesFromDB(query) {
    // كود الجلب من الفايرستور (بناءً على خوارزميتك)
    const snapshot = await db.collection(COLLECTIONS.SPACES).limit(10).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = { generateConciergeReply, finalizeUserSession };
=======
const { db, COLLECTIONS } = require('../config/firebase');

const MODEL_NAME = 'gemini-1.5-pro';

function getLanguageInstruction(lang) {
  return lang === 'ar'
    ? 'Respond in Arabic only.'
    : 'Respond in English only.';
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
    'Do not invent information.',
    'If no match, apologize politely.',
    'Do not answer outside workspace booking domain.',
    'When suggesting a space, append [ACTION:SPACE_ID] using the exact suggested space id.',
    'Support Arabic and English responses depending on user language.',
    getLanguageInstruction(lang),
  ].join(' ');

  return [
    systemInstruction,
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

async function generateConciergeReply({ message, lang }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const { GoogleGenerativeAI } = require('@google/generative-ai');

  const spaces = await fetchSpacesContext();

  if (!spaces.length) {
    return {
      text:
        lang === 'ar'
          ? 'عذرًا، لا توجد مساحات متاحة حاليًا.'
          : 'Sorry, there are no available spaces right now.',
    };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = buildPrompt({ message, lang, spaces });
  const result = await model.generateContent(prompt);
  const rawText = result?.response?.text?.() || '';

  return {
    text: addActionTagIfMissing(rawText.trim(), spaces),
  };
}

module.exports = {
  generateConciergeReply,
};
>>>>>>> 177c929 (Add Flutter AI chat integration guide as flutter_ai.md)
