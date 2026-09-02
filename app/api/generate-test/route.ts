import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { topic, count = 3 } = await req.json();

    const prompt = `You are an expert academic test generator. Generate a multiple-choice test on the topic: "${topic}" containing exactly ${count} questions.
IMPORTANT: Do NOT use LaTeX formatting, backslashes, or math tags like \\( or \\mathbf. Use clean plain text for all formulas and variables.
You MUST return ONLY a valid JSON array matching this exact structure, with no extra markdown blocks or text outside the JSON:
[
  {
    "id": 1,
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Deeply explained reason why the correct answer is right and others are wrong."
  }
]
where "correctAnswer" is the zero-based index of the correct option (0 for first, 1 for second, etc.).`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b',
      temperature: 0.5,
      max_tokens: 8192,
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || '[]';
    const cleanJSON = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(cleanJSON);

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error('Test generation error:', error);
    return NextResponse.json({ error: 'Failed to generate test' }, { status: 500 });
  }
}