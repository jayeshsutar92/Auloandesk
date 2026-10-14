import type { Request, Response, NextFunction } from "express";
import { chatWithAssistant } from "../services/ai-assistant.service.js";
import type { ChatRequest } from "../validators/ai.validator.js";

export async function handleAssistantChat(
  req: Request<unknown, unknown, ChatRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { messages } = req.body;
    const response = await chatWithAssistant(messages);

    res.status(200).json({
      success: true,
      data: {
        message: response.message,
        toolExecutions: response.toolExecutions
      }
    });
  } catch (err) {
    next(err);
  }
}
