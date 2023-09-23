export interface segmentProps {
  name: string;
  ids: number[];
}

export interface popularQuestionsProps {
  question: string;
}

export const popularQuestions: popularQuestionsProps[] = [
  {
    question:
      "I’m creating a social campaign to attract new customers. What would interest you more: Idea 1 or Idea 2?",
  },
  { question: "What other recruiting tools do you use besides Ashby?" },
  { question: "What recruiting metrics do you care most about?" },
  {
    question:
      "What are the most annoying things about Ashby we should improve?",
  },
];
