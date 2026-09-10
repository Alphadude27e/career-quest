import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const maxDuration = 60;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    const prompt = `You are an expert exam tutor. Generate 10 high-yield flashcards for the topic: "${topic}".
Keep the "front" (question/concept) short and punchy.
Keep the "back" (answer/explanation) concise (under 25 words).
Return ONLY valid JSON matching this schema:
{
  "flashcards": [
    { "front": "Concept or Question", "back": "Brief explanation or Answer" }
  ]
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You output strictly valid JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'openai/gpt-oss-120b',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500,
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || '{}';
    const cleanJSON = rawContent.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsedData = JSON.parse(cleanJSON);

    return NextResponse.json({ flashcards: parsedData.flashcards || [] });
  } catch (error: any) {
    console.error('Flashcard generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate flashcards' },
      { status: 500 }
    );
  }
}