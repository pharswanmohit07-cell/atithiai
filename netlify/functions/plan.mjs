import planHandler from "../../api/plan.js";
import { bridgeVercelHandler } from "../bridge.mjs";
export default bridgeVercelHandler(planHandler, "plan");
