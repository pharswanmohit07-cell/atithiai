import intentHandler from "../../api/intent.js";
import { bridgeVercelHandler } from "../bridge.mjs";
export default bridgeVercelHandler(intentHandler, "intent");
