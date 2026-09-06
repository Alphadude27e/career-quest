import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { targetExams } = await req.json();

    const prompt = `You are an expert academic planner. Generate a structured, comprehensive entrance exam syllabus for: "${targetExams}".

CRITICAL INSTRUCTIONS:
1. Break down the syllabus into core Subjects (e.g., Physics, Chemistry, Mathematics/Biology).
2. Include the 5 to 7 most critical, high-weightage chapters per subject.
3. Include 4 to 6 concise key subtopics per chapter.
4. Keep subtopic strings concise (under 8 words each) to avoid token limits.
5. Return ONLY a valid JSON object matching this schema:

{
  "syllabus": [
    {
      "subject": "Physics",
      "chapters": [
        {
          "chapterName": "Kinematics & Motion",
          "subTopics": [
            "Rectilinear motion and velocity",
            "Projectiles in two dimensions",
            "Relative velocity concepts",
            "Uniform circular motion"
          ]
        }
      ]
    }
  ]
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an academic curriculum API that outputs strictly valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'openai/gpt-oss-120b',
      response_format: { type: 'json_object' }, // Guarantees well-formed JSON
      temperature: 0.2,
      max_tokens: 4096, // Maximum token ceiling to avoid cutoffs
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || '{}';

    const cleanJSON = rawContent
      .replace(/```json/gi, '')
      .replace(/```/gi, '')
      .trim();

    const parsedData = JSON.parse(cleanJSON);

    return NextResponse.json({ syllabus: parsedData.syllabus || [] });
  } catch (error: any) {
    console.error('Syllabus generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate comprehensive syllabus' },
      { status: 500 }
    );
  }
}