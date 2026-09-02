import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { careerQuery } = await req.json();

    const prompt = `You are an expert career and college counselor. Provide details for the career or college path: "${careerQuery}".
You MUST return ONLY a valid JSON object matching this exact structure:
{
  "title": "Exact title of career or college major",
  "category": "Field/Industry",
  "topColleges": ["College 1", "College 2", "College 3"],
  "avgSalaryOrOutcome": "Expected starting salary or career outcome",
  "requiredSkills": ["Skill 1", "Skill 2", "Skill 3"],
  "description": "Short 2-sentence description of why this path fits."
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b', // <-- Uses a highly reliable Groq model
      temperature: 0.4,
      response_format: { type: 'json_object' }, // <-- FORCES Groq to only output JSON
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || '{}';
    const cleanJSON = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const opportunityDetails = JSON.parse(cleanJSON);

    return NextResponse.json({ opportunity: opportunityDetails });
  } catch (error: any) {
    // This will print the *actual* error in your VS Code terminal so we can see it!
    console.error('Career generation error:', error); 
    return NextResponse.json(
      { error: error.message || 'Failed to fetch career details' }, 
      { status: 500 }
    );
  }
}