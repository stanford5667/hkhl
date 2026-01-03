import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface QuestionnaireProgress {
  section: string;
  questionId: string;
}

interface InvestorPolicyStatement {
  goals?: any[];
  riskProfile?: any;
  liquidityNeeds?: any;
  constraints?: any;
  rebalancingRules?: any;
  investmentPhilosophy?: string;
}

interface ChatRequest {
  message: string;
  conversationHistory: ConversationMessage[];
  currentProfile: Partial<InvestorPolicyStatement>;
  questionnaireProgress: QuestionnaireProgress;
}

interface ChatResponse {
  message: string;
  extractedData: Partial<InvestorPolicyStatement>;
  suggestedResponses: string[];
  educationalInsert?: { term: string; explanation: string };
  nextQuestion?: string;
  confidenceScore: number;
}

const systemPrompt = `You are a friendly, knowledgeable investment advisor helping users build their Investor Policy Statement (IPS). Your role is to guide them through understanding their investment goals, risk tolerance, and constraints in a conversational way.

## Your Personality:
- Warm, encouraging, and patient
- Explain complex concepts simply without being condescending
- Use analogies and real-world examples
- Be honest about trade-offs and limitations
- NEVER give specific investment advice or guarantee returns
- Always remind users that past performance doesn't guarantee future results

## Understanding User Input:
- Parse natural language about money: "50k" = $50,000, "a million" = $1,000,000
- Parse time expressions: "5 years", "until retirement", "when my kid turns 18"
- Understand emotional risk language: "I'd panic" = low tolerance, "I'd buy more" = high tolerance
- Recognize investment experience levels from context clues

## Your Responsibilities:
1. Guide users through the IPS questionnaire conversationally
2. Extract relevant data from their responses (goals, risk tolerance, time horizon, constraints)
3. Explain technical terms when they come up (Sharpe ratio, diversification, asset allocation, etc.)
4. Periodically summarize what you've learned: "So far I understand that..."
5. If answers seem inconsistent, gently probe: "Earlier you mentioned X, but now Y - can you help me understand?"
6. If user seems confused, offer simpler explanations
7. If user asks off-topic questions, briefly answer but guide back to the questionnaire

## Response Format:
Always respond with valid JSON matching this structure:
{
  "message": "Your conversational response here",
  "extractedData": {
    // Any data parsed from their message - partial InvestorPolicyStatement
    // Include goals, riskProfile, liquidityNeeds, constraints as appropriate
  },
  "suggestedResponses": ["Quick reply 1", "Quick reply 2", "Quick reply 3"],
  "educationalInsert": {
    "term": "Term that needs explaining",
    "explanation": "Plain language explanation"
  },
  "nextQuestion": "The next natural question to ask based on conversation flow",
  "confidenceScore": 0.8
}

## Key Concepts to Explain When Relevant:
- Risk tolerance vs risk capacity (emotional vs financial ability to handle losses)
- Time horizon and its impact on investment choices
- Diversification and why it matters
- Asset allocation and rebalancing
- The relationship between risk and return
- Liquidity needs and emergency funds
- Tax considerations (tax-advantaged accounts, capital gains)
- ESG/sustainable investing
- Cryptocurrency and alternative investments

## Important Guidelines:
- Reference the user's specific numbers when explaining impacts
- Keep responses conversational but informative
- Suggest 3-4 relevant quick reply options
- Set confidenceScore based on how clearly the user communicated (0-1)
- Always include a nextQuestion to keep the conversation flowing
- If the user provides vague answers, ask clarifying follow-ups`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, currentProfile, questionnaireProgress } = await req.json() as ChatRequest;
    
    console.log("[AI-Chat] Received request:", { 
      messageLength: message?.length, 
      historyLength: conversationHistory?.length,
      currentSection: questionnaireProgress?.section,
      currentQuestion: questionnaireProgress?.questionId
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[AI-Chat] LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured");
    }

    // Build context about current profile state
    const profileContext = currentProfile && Object.keys(currentProfile).length > 0
      ? `\n\nCurrent Profile State:\n${JSON.stringify(currentProfile, null, 2)}`
      : '';

    const progressContext = questionnaireProgress
      ? `\n\nQuestionnaire Progress: Currently in section "${questionnaireProgress.section}", question "${questionnaireProgress.questionId}"`
      : '';

    // Build conversation messages for the AI
    const messages = [
      { role: "system", content: systemPrompt + profileContext + progressContext },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    console.log("[AI-Chat] Calling Lovable AI Gateway with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI-Chat] AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI service credits exhausted. Please try again later." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[AI-Chat] Empty response from AI");
      throw new Error("Empty response from AI");
    }

    console.log("[AI-Chat] Raw AI response:", content.substring(0, 200) + "...");

    // Parse the JSON response from the AI
    let parsedResponse: ChatResponse;
    try {
      // Clean up potential markdown code blocks
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      parsedResponse = JSON.parse(cleanContent);
      
      // Validate required fields
      if (!parsedResponse.message) {
        parsedResponse.message = "I'm here to help you build your investment profile. What would you like to discuss?";
      }
      if (!parsedResponse.extractedData) {
        parsedResponse.extractedData = {};
      }
      if (!parsedResponse.suggestedResponses || !Array.isArray(parsedResponse.suggestedResponses)) {
        parsedResponse.suggestedResponses = [
          "Tell me about my risk tolerance",
          "Help me set investment goals",
          "What should I consider for my timeline?"
        ];
      }
      if (typeof parsedResponse.confidenceScore !== 'number') {
        parsedResponse.confidenceScore = 0.5;
      }

      console.log("[AI-Chat] Parsed response successfully:", {
        messageLength: parsedResponse.message.length,
        extractedDataKeys: Object.keys(parsedResponse.extractedData),
        suggestedCount: parsedResponse.suggestedResponses.length,
        confidence: parsedResponse.confidenceScore
      });

    } catch (parseError) {
      console.error("[AI-Chat] Failed to parse AI response as JSON:", parseError);
      
      // Fallback: use the raw content as the message
      parsedResponse = {
        message: content,
        extractedData: {},
        suggestedResponses: [
          "Tell me more",
          "Let's continue with the questionnaire",
          "I have a question"
        ],
        confidenceScore: 0.3
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[AI-Chat] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "An unexpected error occurred",
      message: "I apologize, but I'm having trouble processing your request. Could you please try again?",
      extractedData: {},
      suggestedResponses: ["Let's try again", "Start over", "Ask a different question"],
      confidenceScore: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
