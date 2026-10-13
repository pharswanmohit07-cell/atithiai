import lensHandler from "../../api/lens.js";
import { bridgeVercelHandler } from "../bridge.mjs";
export default bridgeVercelHandler(lensHandler, "lens");
