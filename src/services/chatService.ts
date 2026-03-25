cat > src/services/chatService.ts << 'EOF'
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: Message;
  done: boolean;
}

export async function streamChatResponse(
  messages: Message[],
  onChunk: (chunk: string) => void,
  onError: (error: string) => void
): Promise<void> {
  const functionUrl = import.meta.env.VITE_SUPABASE_FUN_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!functionUrl) {
    onError("Supabase Function URL is missing in environment variables.");
    return;
  }

  if (!anonKey) {
    onError("Supabase Anon Key is missing in environment variables.");
    return;
  }

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey, 
      },
      body: JSON.stringify({
        messages: messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Supabase Function Error:', response.status, errorData);
      throw new Error(`Failed to get response: ${response.status} ${errorData}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      const chunkText = decoder.decode(value, { stream: true });
      
      const lines = chunkText.split('\n');
      
      for (const line of lines) {
        // SSE format: "data: {...}"
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          
          if (dataStr === '[DONE]') {
            continue;
          }

          try {
            const data = JSON.parse(dataStr);
            const content = data.choices?.[0]?.delta?.content;
            const reasoning = data.choices?.[0]?.delta?.reasoning_content;

            if (content) {
              onChunk(content);
            } else if (reasoning) {
              // Optional: Handle reasoning content if needed
              // onChunk(reasoning); 
            }
          } catch (e) {
            console.warn('Error parsing JSON chunk:', e, dataStr);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Streaming error:', error);
    onError(error.message || 'An unexpected error occurred');
  }
}