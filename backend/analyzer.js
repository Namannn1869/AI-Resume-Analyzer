const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = 'You are an expert ATS (Applicant Tracking System) resume analyzer with 15+ years of recruiting experience across tech, finance, and enterprise companies. Your analysis is precise, data-driven, and actionable.';

const buildPrompt = (resumeText) => `Analyze the following resume for ATS compatibility and quality. Return ONLY a valid JSON object with NO markdown, NO code fences, NO extra text — just raw JSON.

Resume Text:
---
${resumeText}
---

Return this exact JSON structure:
{
  "score": <integer 0-100>,
  "verdict": <"Poor" | "Average" | "Good" | "Excellent">,
  "sections": {
    "contactInfo": {
      "score": <integer 0-100>,
      "status": <"good" | "average" | "weak">,
      "feedback": "<specific 1-2 sentence feedback>"
    },
    "summary": {
      "score": <integer 0-100>,
      "status": <"good" | "average" | "weak">,
      "feedback": "<specific 1-2 sentence feedback>"
    },
    "skills": {
      "score": <integer 0-100>,
      "status": <"good" | "average" | "weak">,
      "feedback": "<specific 1-2 sentence feedback>"
    },
    "experience": {
      "score": <integer 0-100>,
      "status": <"good" | "average" | "weak">,
      "feedback": "<specific 1-2 sentence feedback>"
    },
    "education": {
      "score": <integer 0-100>,
      "status": <"good" | "average" | "weak">,
      "feedback": "<specific 1-2 sentence feedback>"
    },
    "keywords": {
      "score": <integer 0-100>,
      "status": <"good" | "average" | "weak">,
      "feedback": "<specific 1-2 sentence feedback>"
    }
  },
  "suggestions": [
    "<actionable suggestion 1>",
    "<actionable suggestion 2>",
    "<actionable suggestion 3>",
    "<actionable suggestion 4>",
    "<actionable suggestion 5>"
  ],
  "keywordsFound": ["<keyword1>", "<keyword2>", "<up to 12 keywords found in resume>"],
  "keywordsMissing": ["<keyword1>", "<keyword2>", "<up to 8 important ATS keywords missing>"]
}

Scoring guide:
- score 0-40: Poor — major ATS issues
- score 41-60: Average — passes basic ATS but needs work  
- score 61-80: Good — solid resume with room for improvement
- score 81-100: Excellent — highly ATS-optimized

Section status: good=70+, average=40-69, weak=0-39`;

/**
 * Parse PDF buffer and extract text
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractText(buffer) {
  const data = await pdf(buffer);
  if (!data.text || data.text.trim().length < 50) {
    throw new Error('Could not parse meaningful text from PDF. Please ensure the PDF is not scanned/image-based.');
  }
  return data.text;
}

/**
 * Parse AI response, stripping any markdown fences if present
 * @param {string} raw
 * @returns {object}
 */
function parseClaudeResponse(raw) {
  let cleaned = raw.trim();
  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Validate the analysis result has the required shape
 * @param {object} result
 */
function validateResult(result) {
  const required = ['score', 'verdict', 'sections', 'suggestions', 'keywordsFound', 'keywordsMissing'];
  for (const key of required) {
    if (!(key in result)) throw new Error(`Missing field: ${key}`);
  }
  const sectionKeys = ['contactInfo', 'summary', 'skills', 'experience', 'education', 'keywords'];
  for (const key of sectionKeys) {
    if (!(key in result.sections)) throw new Error(`Missing section: ${key}`);
  }
}

/**
 * Main analyzer — takes PDF buffer, returns structured analysis
 * @param {Buffer} pdfBuffer
 * @returns {Promise<object>}
 */
async function analyzeResume(pdfBuffer) {
  // 1. Extract text from PDF
  const resumeText = await extractText(pdfBuffer);

  // 2. Call Gemini API
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const prompt = buildPrompt(resumeText);
  const resultObj = await model.generateContent(prompt);
  const rawResponse = resultObj.response.text();

  // 3. Parse and validate
  const result = parseClaudeResponse(rawResponse);
  validateResult(result);

  return result;
}

module.exports = { analyzeResume, extractText, parseClaudeResponse };
