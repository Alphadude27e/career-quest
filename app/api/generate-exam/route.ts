import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    const prompt = `You are an expert academic examiner. Create a 5-question multiple choice quiz on the topic: "${topic}".

CRITICAL RULE FOR ANSWER INDEX:
- "correctAnswerIndex" MUST be an integer: 0 for option 1, 1 for option 2, 2 for option 3, or 3 for option 4.
- Double-check that "options[correctAnswerIndex]" is the scientifically accurate answer.

Return ONLY a valid JSON object matching this schema with no extra markdown ticks or surrounding text:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": [
        "First option",
        "Second option",
        "Third option",
        "Fourth option"
      ],
      "correctAnswerIndex": 0,
      "explanation": "Clear explanation of why this answer is correct."
    }
  ]
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b',
      temperature: 0.1,
      max_tokens: 1500,
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || '{}';

    const cleanJSON = rawContent
      .replace(/```json/gi, '')
      .replace(/```/gi, '')
      .trim();

    const parsedData = JSON.parse(cleanJSON);

    // Sanitize question indices to prevent 1-based or string letter index bugs
    const sanitizedQuestions = (parsedData.questions || []).map((q: any) => {
      let idx = q.correctAnswerIndex;

      // Handle letter responses ("A", "B", "C", "D")
      if (typeof idx === 'string') {
        const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
        idx = letterMap[idx.trim()] ?? 0;
      }

      // Handle 1-based indexing offsets (1 -> 0, 2 -> 1, etc.)
      if (typeof idx === 'number' && idx >= 1 && idx <= 4 && !q.options[idx] && q.options[idx - 1]) {
        idx = idx - 1;
      }

      return {
        question: q.question,
        options: q.options,
        correctAnswerIndex: Number(idx) || 0,
        explanation: q.explanation || '',
      };
    });

    return NextResponse.json({ questions: sanitizedQuestions });
  } catch (error: any) {
    console.error('Test generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate test' },
      { status: 500 }
    );
  }
}