import { ApplicationError, UserError } from "@/lib/errors";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import GPT3Tokenizer from "gpt3-tokenizer";
import { NextRequest } from "next/server";
import "openai";
import { Configuration, OpenAIApi, CreateEmbeddingResponse } from "openai-edge";

import { inspect } from "util";

export const runtime = "edge";

const openAiKey = process.env.OPENAI_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const config = new Configuration({
  apiKey: openAiKey,
});
const openai = new OpenAIApi(config);

const chunkLengthInChars = 1200;

function chunkText(text: string): string[] {
  let chunks = text.match(/.{1,1200}/g);
  return chunks !== null ? chunks : [];
}

export default async function handler(req: NextRequest) {
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

  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const requestData = await req.json();

  if (!requestData) {
    throw new UserError("Missing request data");
  }

  const { textInput, title } = requestData;

  if (!textInput || !title) {
    throw new UserError("Missing query in request data");
  }

  const sections = chunkText(textInput);

  try {
    // TODO: chunk the context window for embedding

    // Create/update page record. Intentionally clear checksum until we
    // have successfully generated all page sections.
    const { error: upsertPageError, data: page } = await supabaseClient
      .from("nods_replica_page")
      .insert({
        replica_title: title,
      })
      .select()
      .limit(1)
      .single();

    if (upsertPageError) {
      console.log("UPSERT ERROR");
      throw upsertPageError;
    }

    for (const content of sections) {
      console.log(content);
      // OpenAI recommends replacing newlines with spaces for best results (specific to embeddings)
      const input = content.replace(/\n/g, " ");

      try {
        const embeddingResponse = await openai.createEmbedding({
          model: "text-embedding-ada-002",
          input,
        });

        const {
          usage: { total_tokens },
          data: [{ embedding }],
          data,
        } = await embeddingResponse.json();

        if (embeddingResponse.status !== 200) {
          console.error("ERROR");
          throw new Error(inspect(data, false, 2));
        }

        const { error: insertPageSectionError, data: pageSection } =
          await supabaseClient
            .from("nods_replica_page_section")
            .insert({
              page_id: page.id,
              content,
              token_count: total_tokens,
              embedding,
            })
            .select()
            .limit(1)
            .single();

        if (insertPageSectionError) {
          throw insertPageSectionError;
        }
      } catch (err) {
        // TODO: decide how to better handle failed embeddings
        console.error(
          `Failed to generate embeddings for page section starting with '${input.slice(
            0,
            40,
          )}...'`,
          // '${path}'
        );

        throw err;
      }
    }
  } catch (err) {
    console.error(
      `one/multiple of its page sections failed to store properly. Page has been marked with null checksum to indicate that it needs to be re-generated.`,
    );
    // Page '${path}' or
    console.error(err);
  }
  // }

  console.log("Embedding generation complete");
}
