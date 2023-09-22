"use client";

import * as React from "react";

import { useCompletion } from "ai/react";
import { Box, Button, FormControl, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";

interface popularQuestionsProps {
  question: string;
}

export function EmailInput() {
  const [query, setQuery] = React.useState<string>("");
  const [nonStreamCompletion, setNonStreamCompletion] =
    React.useState<string>("");
  const popularQuestion: popularQuestionsProps[] = [
    { question: "Why are my customers churning?" },
    { question: "What is the best way to retain my customers?" },
    { question: "What is the best way to increase my sales?" },
    { question: "How much would my customers pay for {X}?" },
  ];

  // TODO: Clean up this file
  const { complete, completion, isLoading, error } = useCompletion({
    id: "1",
    api: "/api/replicate",
  });

  async function getData(query: string) {
    const res = await fetch("/api/replicate", {
      method: "POST",

      body: JSON.stringify({ prompt: query }),
    });
    let response = await res.json();
    response = response.completion;
    console.log(response);
    setNonStreamCompletion(response);
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    console.log(query);
    getData(query);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container>
        <Grid xs={12} sx={{ textAlign: "center" }}>
          <Typography variant="h2">Kalos</Typography>
          <Typography variant="h3">
            Instant Feedback from your customer data
          </Typography>
        </Grid>
        <Grid xs={12}>
          <form onSubmit={handleSubmit}>
            <FormControl fullWidth>
              <Grid xs={12}>
                {/* If made a multi drop down, this can be used to select which users to talk to go to into prompt. dropdown fueled by a user table in backend */}
                <Typography variant="h4">To: All Customers</Typography>
              </Grid>
              <Grid xs={12}>
                <Typography variant="h4">Message: </Typography>
              </Grid>
              <Grid xs={12}>
                {popularQuestion.length > 0 &&
                  popularQuestion.map(
                    (item: popularQuestionsProps, index: number) => {
                      return (
                        <Button
                          key={index}
                          onClick={() => setQuery(item.question)}
                        >
                          {item.question}
                        </Button>
                      );
                    },
                  )}
              </Grid>
              <Grid container xs={12}>
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
                <Button fullWidth type="submit">
                  Send
                </Button>
              </Grid>
            </FormControl>
          </form>
        </Grid>
        <Grid xs={12}>
          <Grid xs={12}>
            <Typography variant="h4">Response: </Typography>
          </Grid>
          <Grid xs={12}>
            {nonStreamCompletion.split("\n").map((item: string, i) => {
              return (
                <Typography display="block" variant="body1" key={i}>
                  {item}
                </Typography>
              );
            })}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
