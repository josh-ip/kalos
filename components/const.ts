export interface segmentProps {
  name: string;
  ids: number[];
}

export interface popularQuestionsProps {
  question: string;
}

export const popularQuestions: popularQuestionsProps[] = [
  { question: "I’m writing a brief. What do you see as the primary value prop of Ashby?" },
 
  { question: "What are all the recruiting tools you use?" },

  { question: "What recruiting metrics do you care most about?" },
  {
    question:
      "What are the most frustrating parts of your Ashby experience?",
  },
];
