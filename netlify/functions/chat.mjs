import chatHandler from "../../api/chat.js";
import { bridgeVercelHandler } from "../bridge.mjs";
export default bridgeVercelHandler(chatHandler, "chat");
