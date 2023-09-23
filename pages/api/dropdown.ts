import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { ApplicationError, UserError } from "@/lib/errors";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export interface segmentProps {
  name: string;
  ids: number[];
}

export const runtime = "edge";

export default async function handler(req: NextRequest) {
  try {
    if (!supabaseUrl) {
      throw new ApplicationError("Missing environment variable SUPABASE_URL");
    }

    if (!supabaseServiceKey) {
      throw new ApplicationError(
        "Missing environment variable SUPABASE_SERVICE_ROLE_KEY",
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: segments, error: segmentError } = await supabaseClient
      .from("segments")
      .select("segment_name, user_ids");

    if (!segments || segmentError) {
      throw new ApplicationError("Failed to retrieve segments", segmentError);
    }
    console.log("hello");

    const segmentsTransformed: segmentProps[] = segments.map((segment) => ({
      name: segment.segment_name,
      ids: segment.user_ids,
    }));

    console.log(segments);

    const { data: individualUsers, error: individualUserError } =
      await supabaseClient
        .from("nods_replica_page")
        .select("id, replica_title");
    if (!individualUsers || individualUserError) {
      throw new ApplicationError(
        "Failed to retrieve segments",
        individualUserError,
      );
    }

    console.log(individualUsers);

    const individualUsersTransformed: segmentProps[] = individualUsers.map(
      (user) => ({ name: user.replica_title, ids: [user.id] }),
    );

    console.log({
      segments: segmentsTransformed,
      individualUserSegments: individualUsersTransformed,
    });

    // Stitch responses together and return to the backend
    return new Response(
      JSON.stringify({
        segments: segmentsTransformed,
        individualUserSegments: individualUsersTransformed,
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
