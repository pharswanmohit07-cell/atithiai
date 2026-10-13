import jaipur from "./jaipur.js";
import ubud from "./ubud.js";
import lisbon from "./lisbon.js";

export const DESTINATIONS = Object.freeze([jaipur, ubud, lisbon]);
export const DEFAULT_DESTINATION_ID = "jaipur";

export function getDestinationById(id) {
  return DESTINATIONS.find((destination) => destination.id === id) || DESTINATIONS.find((destination) => destination.id === DEFAULT_DESTINATION_ID);
}
