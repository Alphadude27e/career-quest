import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { exams } = await req.json();

    const prompt = `You are an expert academic curriculum designer. Create a consolidated, chapter-by-chapter syllabus for the following competitive exams: ${exams.join(', ')}.
    
Output the response STRICTLY as a valid JSON object containing a single key "topics" which is an array of objects. 
Each object in the array MUST have the following structure:
{
  "id": "unique_string_id",
  "subject": "Physics/Chemistry/Mathematics/Biology/General",
  "chapter": "Name of the chapter",
  "topic": "Specific topic or sub-topic",
  "category": "Overlapping" (if covered in multiple exams) or "Individual" (if specific to one),
  "exams": ["Exam1", "Exam2"],
  "difficultyComparison": { "Exam1": "Hard", "Exam2": "Medium" }
}

Generate exactly 15 highly accurate core topics distributed across the relevant subjects based on the provided exams. Use "Easy", "Medium", "Hard", or "Advanced" for difficulty.
Do NOT include markdown formatting, backticks, or any text outside the JSON object.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b', // <--- Updated to use your preferred model
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const rawReply = chatCompletion.choices[0]?.message?.content || '{"topics": []}';
    const parsedData = JSON.parse(rawReply);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Syllabus generation error:', error);
    return NextResponse.json({ error: 'Failed to generate syllabus' }, { status: 500 });
  }
}