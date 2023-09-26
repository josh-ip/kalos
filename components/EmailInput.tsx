"use client";

import * as React from "react";

import { Box, Button, FormControl, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { popularQuestions, popularQuestionsProps, segmentProps } from "./const";
import GroupedSelect from "./ui/dropdown";
import { useEffect, useState } from "react";

// export async function getServerSideProps() {
//   // Fetch data from external API
//   const res = await fetch(`/api/dropdown`);
//   const data = await res.json();
//   // Pass data to the page via props
//   return { props: { data } };
// }

export function EmailInput() {
  const [query, setQuery] = React.useState<string>("");
  const [replica, setReplica] = React.useState<number>(0);
  const [nonStreamCompletion, setNonStreamCompletion] =
    React.useState<string>("");

  const [segments, setSegments] = useState<segmentProps[]>([]);
  const [individualUserSegments, setIndividualUserSegments] = useState<
    segmentProps[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("api/dropdown");
        const data = await response.json();
        setSegments(data.segments);
        setIndividualUserSegments(data.individualUserSegments);
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
  }, []);

  async function getData(query: string, replicaArray: number[]) {
    const res = await fetch("/api/replicate", {
      method: "POST",

      body: JSON.stringify({ prompt: query, replicas: replicaArray }),
    });
    let response = await res.json();
    response = response.completion;
    console.log(response);
    setNonStreamCompletion(response);
  }

  const getReplicaArray = (
    segments: segmentProps[],
    individualUserSegments: segmentProps[],
    index: number,
  ) => {
    if (segments.length > index) {
      return segments[index].ids;
    } else {
      return individualUserSegments[index - segments.length].ids;
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    console.log(query);
    console.log(segments.length, replica);
    const replicaArray = getReplicaArray(
      segments,
      individualUserSegments,
      replica,
    );
    console.log(replicaArray);
    setNonStreamCompletion("");
    getData(query, replicaArray);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {(segments || individualUserSegments) && (
        <Grid container>
          <Grid xs={12} sx={{ textAlign: "center", mb: 2 }}>
            <Typography variant="h2">Kalos</Typography>
            <Typography variant="h3">
              Instant Focus Groups from your Customer Data
            </Typography>
          </Grid>
          <Grid xs={12}>
            <form onSubmit={handleSubmit}>
              <FormControl fullWidth>
                <Grid xs={12}>
                  {/* If made a multi drop down, this can be used to select which users to talk to go to into prompt. dropdown fueled by a user table in backend */}
                  <Typography variant="h4">Audience:</Typography>
                  <GroupedSelect
                    segments={segments}
                    individualUserSegments={individualUserSegments}
                    setReplica={setReplica}
                  />
                </Grid>
                <Grid xs={12} sx={{ mt: 2 }}>
                  <Typography variant="h4">Question: </Typography>
                </Grid>
                <Grid xs={12}>
                  {popularQuestions.length > 0 &&
                    popularQuestions.map(
                      (item: popularQuestionsProps, index: number) => {
                        return (
                          <Button
                            variant="outlined"
                            key={index}
                            onClick={() => setQuery(item.question)}
                            sx={{ m: 1, borderRadius: 20 }}
                          >
                            {item.question}
                          </Button>
                        );
                      },
                    )}
                </Grid>
                <Grid container xs={12} sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    id="outlined-multiline-static"
                    // label="Multiline"
                    multiline
                    rows={4}
                    // defaultValue="Default Value"
                    // variant="filled"
                    sx={{ backgroundColor: "white" }}
                    // Add on submit
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </Grid>
                <Grid xs={12}>
                  <Button
                    disabled={query === "" ? true : false}
                    fullWidth
                    type="submit"
                  >
                    Send
                  </Button>
                </Grid>
              </FormControl>
            </form>
          </Grid>
          <Grid xs={12}>
            <Grid xs={12}>
              <Typography variant="h4">Answer: </Typography>
            </Grid>
            <Grid xs={12}>
              {nonStreamCompletion
                ? nonStreamCompletion.split("\n").map((item: string, i) => {
                    return (
                      <Typography display="block" variant="body1" key={i}>
                        {item}
                      </Typography>
                    );
                  })
                : ""}
            </Grid>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
