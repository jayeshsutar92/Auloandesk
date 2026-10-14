import { Router } from "express";
import { handleAssistantChat } from "../controllers/ai.controller.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { chatRequestSchema } from "../validators/ai.validator.js";

const router = Router();

// POST /api/v1/chat
router.post("/chat", validateBody(chatRequestSchema), handleAssistantChat);

// POST /api/v1/assistant/chat
router.post("/assistant/chat", validateBody(chatRequestSchema), handleAssistantChat);

export default router;
