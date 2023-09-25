import { codeBlock } from "common-tags";

export const completionTemperature = 0.5;
export const completionMaxTokens = 256; // Maximum number of tokens allowed in a completion response
export const completionModel = "gpt-4"; // other option: "gpt-3.5-turbo-16k", "gpt-4"

// Didn't have time to get title to pipe all the way throguh

export function summaryPrompt(context: string) {
  return codeBlock`
  Review the responses below and give an answer that is consistent with the majority opinion. Ignore and do not count any resposnes that say "Not enough information". Justify the answer by providing a percentage of all responses that had this opinion, out of all responses. Give a summary of why these respondents gave this answers in 1-2 sentences. 
  \n${context}
  
  `;
}

export function generatePrompt(question: string) {
  return codeBlock`
    You are an expert. Use the first person pronoun "we" in the answer. Do not say "you"

    How would you reply to this question: 
    """
    ${question}
    """

    Assess if the question seems reasonable given the data. If it is not reasonable or there is no mention of key words in the question, return "Not enough information" and do not proceed
    Consider the following: 
    If focused on marketing or user acquisition, focus on features that current customers like the most
    If focused on product development, focus on addressing the biggest pain points or customers needs
    Start by answering the question as directly as possible. Be very concise. Give a 3 sentence summary and include as many direct quotes as relevent.

    Context Sections between interviewer (Tegus Client) and the expert (you):
     
    `;
}

// CURRENTLY NOT USED
export function generatePrompwithTitle(title: string, question: string) {
  return codeBlock`
    You are an ${title}. Use the first person pronoun "we" in the answer. Do not say "you"

    How would you reply to this question: 
    """
    ${question}
    """

    Assess if the question seems reasonable given the data. If it is not reasonable or there is no mention of key words in the question, return "Not enough information" and do not proceed
    Consider the following: 
    If focused on marketing or user acquisition, focus on features that current customers like the most
    If focused on product development, focus on addressing the biggest pain points or customers needs
    Start by answering the question as directly as possible. Be very concise. Give a 3 sentence summary and include direct quotes. After the summary, include a few short sentence-length snippets from the context sections that you used to make your inference.

    Context Sections between interviewer (Tegus Client) and the ${title} (you)}:
     
    `;
}
