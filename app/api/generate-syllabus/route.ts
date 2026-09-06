import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { targetExams } = await req.json();

    const prompt = `You are an expert academic planner. Generate a highly detailed, comprehensive syllabus for the following exam(s): ${targetExams}.

STRICT INSTRUCTIONS:
1. Do NOT summarize. Provide a deep, granular breakdown of the actual official syllabus.
2. Break it down strictly by Subject -> Chapters -> Sub-topics.
3. Return ONLY a valid JSON object matching this exact schema, with no markdown formatting or extra text:

{
  "syllabus": [
    {
      "subject": "Physics",
      "chapters": [
        {
          "chapterName": "Kinematics",
          "subTopics": [
            "Frame of reference",
            "Motion in a straight line",
            "Position-time graph",
            "Speed and velocity"
          ]
        }
      ]
    }
  ]
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2, // Low temperature for factual structuring
      max_tokens: 4000, // Increased token limit for a much longer, detailed response
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || '{}';

    // Clean markdown if the AI accidentally adds it
    const cleanJSON = rawContent
      .replace(/```json/gi, '')
      .replace(/```/gi, '')
      .trim();

    const parsedData = JSON.parse(cleanJSON);

    return NextResponse.json({ syllabus: parsedData.syllabus });
  } catch (error: any) {
    console.error('Syllabus generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate comprehensive syllabus' },
      { status: 500 }
    );
  }
}