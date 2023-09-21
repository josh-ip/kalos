import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { codeBlock, oneLine } from "common-tags";
import GPT3Tokenizer from "gpt3-tokenizer";
import {
  Configuration,
  OpenAIApi,
  CreateModerationResponse,
  CreateEmbeddingResponse,
  ChatCompletionRequestMessage,
} from "openai-edge";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { ApplicationError, UserError } from "@/lib/errors";
import { replit_call } from "./const";

const openAiKey = process.env.OPENAI_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const config = new Configuration({
  apiKey: openAiKey,
});
const openai = new OpenAIApi(config);

export const runtime = "edge";

export default async function handler(req: NextRequest) {
  try {
    if (!openAiKey) {
      throw new ApplicationError("Missing environment variable OPENAI_KEY");
    }

    if (!supabaseUrl) {
      throw new ApplicationError("Missing environment variable SUPABASE_URL");
    }

    if (!supabaseServiceKey) {
      throw new ApplicationError(
        "Missing environment variable SUPABASE_SERVICE_ROLE_KEY",
      );
    }

    const requestData = await req.json();

    if (!requestData) {
      throw new UserError("Missing request data");
    }

    const { prompt: query } = requestData;

    if (!query) {
      throw new UserError("Missing query in request data");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Moderate the content to comply with OpenAI T&C
    const sanitizedQuery = query.trim();
    const moderationResponse: CreateModerationResponse = await openai
      .createModeration({ input: sanitizedQuery })
      .then((res) => res.json());

    const [results] = moderationResponse.results;

    if (results.flagged) {
      throw new UserError("Flagged content", {
        flagged: true,
        categories: results.categories,
      });
    }

    const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
    let tokenCount = 0;
    let contextText = "";

    //TODO: Pull this out into a const.ts file for matt
    // const prompt = codeBlock`
    //   ${oneLine`
    //     You are a very enthusiastic Supabase representative who loves
    //     to help people! Make up a random sentence that you care about
    //   `}

    //   Context sections:
    //   ${contextText}

    //   Question: """
    //   ${sanitizedQuery}
    //   """

    //   Answer as markdown (including related code snippets if available):
    // `;

    const title = `Head of Talent Acquisition at Replit`;
    const prompt = codeBlock`
    You are the ${title}. Use the first person pronoun "we" in the answer. Do not say "you"

    How would you reply to this question: 
    """
    ${sanitizedQuery}
    """

    Assess if the question seems reasonable given the data. If it is not reasonable or there is no mention of key words in the question, return "Not enough information" and do not proceed
    Consider the following: 
    If focused on marketing or user acquisition, focus on features that current customers like the most
    If focused on product development, focus on addressing the biggest pain points or customers needs
    Start by answering the question as directly as possible. Be very concise. Give a 3 sentence summary and include direct quotes.

    Context Sections between interviewer (Tegus Client) and the ${title}: 
    `;
    //     ${replit_call}

    const chatMessage: ChatCompletionRequestMessage = {
      role: "user",
      content: "what's your favorite fruit?",
    };

    // Backup: do Promise.all to chain the response and turn off SSR and just receive the text back. Would be easier
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [chatMessage],
      max_tokens: 20,
      temperature: 0,
      // stream: true,
    });

    let promise1 = openai.createChatCompletion({
      model: "gpt-4",
      messages: [chatMessage],
      max_tokens: 20,
      temperature: 1,
      // stream: true,
    });

    let promise2 = openai.createChatCompletion({
      model: "gpt-4",
      messages: [chatMessage],
      max_tokens: 20,
      temperature: 1,
      // stream: true,
    });

    let promise3 = openai.createChatCompletion({
      model: "gpt-4",
      messages: [chatMessage],
      max_tokens: 20,
      temperature: 1,
      // stream: true,
    });

    let promise4 = openai.createChatCompletion({
      model: "gpt-4",
      messages: [chatMessage],
      max_tokens: 20,
      temperature: 1,
      // stream: true,
    });

    Promise.all([promise1, promise2, promise3, promise4]).then(
      async (values) => {
        for (const value of values) {
          console.log(await value.json());
        }
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new ApplicationError("Failed to generate completion", error);
    }

    // Transform the response into a readable stream
    // const stream = OpenAIStream(response);
    let chat_message = await response.json();
    chat_message = chat_message.choices[0].message.content;

    // Return a StreamingTextResponse, which can be consumed by the client
    return response;
    //new StreamingTextResponse(stream);
  } catch (err: unknown) {
    if (err instanceof UserError) {
      return new Response(
        JSON.stringify({
          error: err.message,
          data: err.data,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    } else if (err instanceof ApplicationError) {
      // Print out application errors with their additional data
      console.error(`${err.message}: ${JSON.stringify(err.data)}`);
    } else {
      // Print out unexpected errors as is to help with debugging
      console.error(err);
    }

    // TODO: include more response info in debug environments
    return new Response(
      JSON.stringify({
        error: "There was an error processing your request",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// API post to hit edge function: http://localhost:3000/api/vector-search
