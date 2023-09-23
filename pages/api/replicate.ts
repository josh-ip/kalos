import type { NextRequest } from "next/server";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import GPT3Tokenizer from "gpt3-tokenizer";
import {
  Configuration,
  OpenAIApi,
  CreateModerationResponse,
  CreateEmbeddingResponse,
  ChatCompletionRequestMessage,
} from "openai-edge";
import { ApplicationError, UserError } from "@/lib/errors";
import {
  completionMaxTokens,
  completionModel,
  completionTemperature,
  generatePrompt,
} from "./const";

const openAiKey = process.env.OPENAI_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const config = new Configuration({
  apiKey: openAiKey,
});
const openai = new OpenAIApi(config);

export const runtime = "edge";

async function findEmbeddings(
  supabaseClient: SupabaseClient,
  query: string,
  id: number,
) {
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
    "match_replica_page_sections_by_id",
    {
      embedding,
      match_threshold: 0.78,
      match_count: 10,
      min_content_length: 50,
      user_id: id,
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

    const { prompt: query, replicas } = requestData;

    console.log(replicas);

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

    // Create an array of promises to push into Promise.all() based on requested responses

    // This should be the string of IDs, for every ID pull embeddings
    // TODO: needs to be filled out with real users and fed in from the front end upon selection – think about how to maintain this constant
    // TODO: as default need to retrieve all IDs in the table and just iterate through them

    let requestedPersonas = [];
    for (const value of replicas) {
      const title = `Head of Talent Acquisition at Replit`; // TODO: add the title in the retrieval of this information

      const foundText = await findEmbeddings(
        supabaseClient,
        sanitizedQuery,
        value,
      );
      const prompt = generatePrompt(title, sanitizedQuery);

      const chatMessage: ChatCompletionRequestMessage = {
        role: "user",
        content: prompt + foundText,
      };

      requestedPersonas.push(
        openai.createChatCompletion({
          model: completionModel,
          messages: [chatMessage],
          max_tokens: completionMaxTokens,
          temperature: completionTemperature,
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

    const summaryMessage: ChatCompletionRequestMessage = {
      role: "user",
      content: `Summarize the following responses into one set of three sentences \n${stitchedResponse}`,
    };

    const summary = await openai.createChatCompletion({
      model: completionModel,
      messages: [summaryMessage],
      max_tokens: completionMaxTokens,
      temperature: completionTemperature,
      stream: false,
    });

    if (!summary.ok) {
      const error = await summary.json();
      throw new ApplicationError("Failed to generate completion", error);
    }

    const {
      choices: [
        {
          message: { content: summaryText },
        },
      ],
    } = await summary.json();

    const summaryAndResponses =
      "Summary:\n" + summaryText + "\n \n" + stitchedResponse;

    // Stitch responses together and return to the backend
    return new Response(
      JSON.stringify({
        completion: summaryAndResponses,
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
