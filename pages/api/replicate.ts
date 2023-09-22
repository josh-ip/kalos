import type { NextRequest } from "next/server";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
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
// import { replit_call } from "./const";

const openAiKey = process.env.OPENAI_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const config = new Configuration({
  apiKey: openAiKey,
});
const openai = new OpenAIApi(config);

export const runtime = "edge";

async function findEmbeddings(supabaseClient: SupabaseClient, query: string) {
  // Create embedding from query
  const embeddingResponse = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: query.replaceAll("\n", " "),
  });

  if (embeddingResponse.status !== 200) {
    throw new ApplicationError(
      "Failed to create embedding for question",
      embeddingResponse,
    );
  }

  const {
    data: [{ embedding }],
  }: CreateEmbeddingResponse = await embeddingResponse.json();

  const { error: matchError, data: pageSections } = await supabaseClient.rpc(
    "match_replica_page_sections",
    {
      embedding,
      match_threshold: 0.78,
      match_count: 10,
      min_content_length: 50,
    },
  );

  if (matchError) {
    throw new ApplicationError("Failed to match page sections", matchError);
  }

  const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
  let tokenCount = 0;
  let contextText = "";

  for (let i = 0; i < pageSections.length; i++) {
    const pageSection = pageSections[i];
    const content = pageSection.content;
    const encoded = tokenizer.encode(content);
    tokenCount += encoded.text.length;

    if (tokenCount >= 1500) {
      break;
    }

    contextText += `${content.trim()}\n---\n`;
  }

  return contextText;
}

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

    const foundText = await findEmbeddings(supabaseClient, sanitizedQuery);

    // TODO: Pull this out into a const.ts file for matt

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
    Start by answering the question as directly as possible. Be very concise. Give a 3 sentence summary and include direct quotes. After the summary, include a few short sentence-length snippets from the context sections that you used to make your inference.

    Context Sections between interviewer (Tegus Client) and the ${title}: 
    ${foundText}
    `;
    //     ${replit_call}

    const chatMessage: ChatCompletionRequestMessage = {
      role: "user",
      content: prompt,
    };

    console.log(prompt);

    // Create an array of promises to push into Promise.all() based on requested responses

    // This should be the string of IDs, for every ID pull embeddings
    const values = [1];
    let requestedPersonas = [];
    for (const value of values) {
      requestedPersonas.push(
        openai.createChatCompletion({
          model: "gpt-4",
          messages: [chatMessage],
          max_tokens: 512,
          temperature: 0.5,
          // stream: true,
        }),
      );
    }

    // Push promsies into Promise.all()

    let stitchedResponse = "";
    await Promise.all(requestedPersonas).then(async (values) => {
      let counter = 1;
      for (const value of values) {
        const response = await value.json();
        stitchedResponse +=
          `Response #${counter}:\n` +
          response.choices[0].message.content +
          `\n`;
        counter++;
      }
    });

    // Stitch responses together and return to the backend
    return new Response(
      JSON.stringify({
        completion: stitchedResponse,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
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
