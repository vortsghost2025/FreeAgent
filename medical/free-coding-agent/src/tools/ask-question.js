import { BaseTool } from "./base.js";

export class AskQuestionTool extends BaseTool {
  constructor(config = {}) {
    super(config);
    this.name = "ask_followup_question";
    this.description = "Ask the user a follow-up question";
    this.onQuestion = config.onQuestion || null;
  }

  async execute(params) {
    try {
      if (!params.question) {
        return {
          success: false,
          error: "Missing required parameter: question",
        };
      }

      // If there's a callback for handling questions
      if (this.onQuestion) {
        const answer = await this.onQuestion(params.question);
        return {
          success: true,
          output: answer,
          answer: answer,
        };
      }

      // Otherwise return that a question needs to be answered
      return {
        success: true,
        requiresInput: true,
        output: params.question,
        question: params.question,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        question: {
          type: "string",
          required: true,
          description: "Question to ask the user",
        },
      },
    };
  }
}
