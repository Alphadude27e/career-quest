import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    const prompt = `You are an expert academic examiner. Create a 5-question multiple-choice quiz on the topic: "${topic}".

STRICT RULES:
1. Provide 4 clear options for each question.
2. In "correctAnswer", write the EXACT string matching the correct option verbatim from your options array. Do not provide numbers or letters.
3. Verify that the answer is factually and scientifically accurate.

Return ONLY a valid JSON object matching this schema with no extra text or markdown formatting:
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
      "correctAnswer": "First option",
      "explanation": "Clear explanation of why this answer is correct."
    }
  ]
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 1500,
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || '{}';

    const cleanJSON = rawContent
      .replace(/```json/gi, '')
      .replace(/```/gi, '')
      .trim();

    const parsedData = JSON.parse(cleanJSON);

    const sanitizedQuestions = (parsedData.questions || []).map((q: any) => {
      // Find the exact index matching the string answer
      let correctIndex = q.options.findIndex(
        (opt: string) => opt.trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase()
      );

      // Fallback in case the model used a partial match
      if (correctIndex === -1) {
        correctIndex = q.options.findIndex((opt: string) =>
          opt.toLowerCase().includes(String(q.correctAnswer || '').toLowerCase())
        );
      }

      const finalIndex = correctIndex >= 0 ? correctIndex : 0;

      return {
        question: q.question,
        options: q.options,
        correctAnswer: q.options[finalIndex],
        correctAnswerIndex: finalIndex,
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