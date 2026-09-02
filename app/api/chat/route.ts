import Groq from 'groq-sdk';

export const maxDuration = 60;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, profile } = await req.json();

    const systemPrompt = `You are the lead AI Academic Counsellor and Student Success Advisor for "CareerQuest".
You guide school and college students through academic roadmaps, entrance exams (like JEE, NEET, CUET, SAT, NID), stream selection, syllabus strategies, and university admissions.

STUDENT PROFILE CONTEXT:
- Name: ${profile?.name || 'Student'}
- Grade/Class: ${profile?.grade || 'Not specified'}
- Stream/Path: ${profile?.stream || 'General'}
- Primary Goal: ${profile?.targetGoal || 'Undecided'}
- Focus/Weak Areas: ${profile?.weakSubjects?.join(', ') || 'None logged yet'}`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // 1. Ask Groq for a stream instead of waiting for the full response
    const chatStream = await groq.chat.completions.create({
      messages: formattedMessages,
      model: 'openai/gpt-oss-120b',
      temperature: 0.6,
      stream: true, // <-- CRITICAL CHANGE
      max_tokens: 4096
    });

    // 2. Create a stream to send back to the browser immediately
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatStream) {
            // Extract the tiny piece of text generated in this chunk
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              // Send it to the frontend
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // 3. Return the streaming response (Not JSON!)
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Groq API Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to communicate with AI engine.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}