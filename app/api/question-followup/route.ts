import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { topic, messages } = await req.json();

    // The new Socratic, chunked-learning prompt
    const systemPrompt = `You are an elite, interactive AI Socratic Tutor helping a student master concepts for exams like JEE, NEET, and SAT.
The current chapter is: "${topic || 'General Learning'}".

CRITICAL INSTRUCTION - TEACHING METHODOLOGY:
1. PHASED LEARNING: If the student is just starting this chapter, divide the chapter into logical sub-topics/phases (e.g., Phase 1: 1D Motion, Phase 2: Gravity, etc.) and ask them which phase they want to start with. DO NOT teach anything until they choose a phase.
2. CHUNKED EXPLANATIONS: Once they choose, teach ONE single concept at a time. Never overwhelm the student with a massive wall of text. Keep it highly focused.
3. CHECK FOR UNDERSTANDING: After explaining a concept, ask if they have any follow-up questions before moving on.
4. KNOWLEDGE TEST: If they understand the concept (or have no questions), give them a concise practice question applying ONLY the knowledge taught so far. Wait for them to answer.
5. FORMATTING: Format all mathematical equations using strictly $ for inline math and $$ for display math.
6. NO INTERNAL LOGS: DO NOT output any <think> tags or mental drafts. Talk directly to the student.`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: any) => {
        if (msg.role === 'user' && msg.image) {
          return {
            role: 'user',
            content: [
              { type: 'text', text: msg.content || 'Please explain the question in this image.' },
              { type: 'image_url', image_url: { url: msg.image } }
            ]
          };
        }
        return { role: msg.role, content: msg.content };
      })
    ];

    const chatStream = await groq.chat.completions.create({
      messages: formattedMessages,
      model: 'openai/gpt-oss-120b', 
      temperature: 0.5,
      max_tokens: 2500, 
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of chatStream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              const cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
              controller.enqueue(encoder.encode(cleanText));
            }
          }
        } catch (err) {
          console.error('Streaming error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}