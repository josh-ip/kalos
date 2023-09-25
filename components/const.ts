export interface segmentProps {
  name: string;
  ids: number[];
}

export interface popularQuestionsProps {
  question: string;
}

export const popularQuestions: popularQuestionsProps[] = [
  { question: "I’m writing a brief and need to focus on the primary value prop. What do you see as the primary value prop of Ashby?" },
 
  { question: "What are all the recruiting tools you?" },

  { question: "What recruiting metrics do you care most about?" },
  {
    question:
      "What are the most annoying things about Ashby we should improve?",
  },
];
