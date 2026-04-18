const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      systemInstruction: 'You are an ATS system.',
    });
    console.log('Sending request...');
    const resultObj = await model.generateContent('Here is a resume text. Return JSON. {"score": 50}');
    console.log('Response:', resultObj.response.text());
  } catch (err) {
    console.error('Error details:', err);
  }
}
testGemini();
