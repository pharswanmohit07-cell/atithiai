import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useDestination } from "./DestinationContext.jsx";
import { DESTINATIONS } from "../data/destinations/index.js";

const HotelContext = createContext(null);
const PROFILE_KEY = "atithi-guest-preferences";
const EMPTY_PREFERENCES = { language: "English", dietaryPreference: "No preference", travelParty: "Family" };
const DIETARY_OPTIONS = ["No preference", "Vegetarian", "Vegan", "Pescatarian", "Halal", "Gluten-free", "Dairy-free", "Other — ask me"];
const PARTY_OPTIONS = ["Family", "Solo", "Couple", "Friends", "Business"];
const requestsKey = (id) => "atithi-requests:" + id;
const chatKey = (id) => "atithi-chat:" + id;
const settingsKey = (id) => "atithi-flex-settings:" + id;
const actionsKey = (id) => "atithi-actions:" + id;
const WELCOME = "Welcome. I’m your hotel co-host for this demo stay. Ask about local experiences, food, weather or a request for the team.";

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}
function safeRead(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
    if (fallback === null) return parsed;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch { return fallback; }
}
function safeWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep demo state in memory if browser storage is unavailable. */ }
}
function readPreferences() {
  const saved = safeRead(PROFILE_KEY, {});
  return {
    ...EMPTY_PREFERENCES,
    language: typeof saved.language === "string" && saved.language.trim() ? (saved.language === "en" ? "English" : saved.language.trim().slice(0, 50)) : "English",
    dietaryPreference: DIETARY_OPTIONS.includes(saved.dietaryPreference) ? saved.dietaryPreference : "No preference",
    travelParty: PARTY_OPTIONS.includes(saved.travelParty) ? saved.travelParty : "Family",
  };
}
function defaultFlexSettings(destination) {
  return {
    flexTiers: {
      early: (destination.hotel.flexTiers?.early || []).map((tier) => ({ from: tier.from, fee: Number(tier.fee) })),
      late: (destination.hotel.flexTiers?.late || []).map((tier) => ({ until: tier.until, fee: Number(tier.fee) })),
    },
    cutoffs: { earlyEarliest: destination.hotel.flexCutoffs?.earlyEarliest || "10:00", lateLatest: destination.hotel.flexCutoffs?.lateLatest || "15:00" },
    autoApproveEnabled: false,
    autoApproveUnder: 0,
    chefSpecial: "Chef's special: ask the kitchen for today's seasonal option (demo).",
    hostPicks: { localExperiences: true, localFood: true, quieterPlaces: false },
    hostPickNotes: {
      localExperiences: "Share demo listings only after the front desk verifies provider details.",
      localFood: "Confirm ingredients and allergens with the kitchen.",
      quieterPlaces: "Offer quieter options when the guest asks for a calm visit.",
    },
  };
}
function validTime(value) {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function readFlexSettings(destination) {
  const base = defaultFlexSettings(destination);
  const saved = safeRead(settingsKey(destination.id), {});
  const early = Array.isArray(saved?.flexTiers?.early) && saved.flexTiers.early.length ? saved.flexTiers.early : base.flexTiers.early;
  const late = Array.isArray(saved?.flexTiers?.late) && saved.flexTiers.late.length ? saved.flexTiers.late : base.flexTiers.late;
  const hostPicks = saved.hostPicks && typeof saved.hostPicks === "object" ? saved.hostPicks : {};
  const hostPickNotes = saved.hostPickNotes && typeof saved.hostPickNotes === "object" ? saved.hostPickNotes : {};
  return {
    flexTiers: {
      early: early.map((tier, index) => ({
        from: validTime(tier?.from) ? tier.from : (base.flexTiers.early[index]?.from || base.flexTiers.early[base.flexTiers.early.length - 1].from),
        fee: Number.isFinite(Number(tier?.fee)) && Number(tier.fee) >= 0 ? Number(tier.fee) : (base.flexTiers.early[index]?.fee || 0),
      })),
      late: late.map((tier, index) => ({
        until: validTime(tier?.until) ? tier.until : (base.flexTiers.late[index]?.until || base.flexTiers.late[base.flexTiers.late.length - 1].until),
        fee: Number.isFinite(Number(tier?.fee)) && Number(tier.fee) >= 0 ? Number(tier.fee) : (base.flexTiers.late[index]?.fee || 0),
      })),
    },
    cutoffs: {
      earlyEarliest: validTime(saved?.cutoffs?.earlyEarliest) ? saved.cutoffs.earlyEarliest : base.cutoffs.earlyEarliest,
      lateLatest: validTime(saved?.cutoffs?.lateLatest) ? saved.cutoffs.lateLatest : base.cutoffs.lateLatest,
    },
    autoApproveEnabled: saved.autoApproveEnabled === true,
    autoApproveUnder: Number.isFinite(Number(saved.autoApproveUnder)) && Number(saved.autoApproveUnder) >= 0 ? Number(saved.autoApproveUnder) : 0,
    chefSpecial: typeof saved.chefSpecial === "string" ? saved.chefSpecial.slice(0, 500) : base.chefSpecial,
    hostPicks: Object.fromEntries(Object.keys(base.hostPicks).map((key) => [key, hostPicks[key] === undefined ? base.hostPicks[key] : hostPicks[key] === true])),
    hostPickNotes: Object.fromEntries(Object.keys(base.hostPickNotes).map((key) => [key, typeof hostPickNotes[key] === "string" ? hostPickNotes[key].slice(0, 300) : base.hostPickNotes[key]])),
  };
}
function readRequests(destinationId) {
  return safeRead(requestsKey(destinationId), []).filter((item) => item && typeof item.id === "string" && item.destinationId === destinationId).slice(0, 80);
}
function readChatMessages(destinationId) {
  const saved = safeRead(chatKey(destinationId), null);
  return Array.isArray(saved) ? saved.filter((item) => item && typeof item.text === "string").slice(-100) : [
    { id: "welcome-" + destinationId, role: "assistant", text: WELCOME, createdAt: new Date().toISOString() },
  ];
}
function readActions(destinationId) {
  return safeRead(actionsKey(destinationId), []).filter((item) => item && typeof item.id === "string").slice(0, 100);
}
function initialItinerary(destination) {
  return destination.places.slice(0, 4).map((place, index) => ({
    id: place.id, placeId: place.id, title: place.name, note: "Suggested stop · Demo itinerary", order: index + 1,
  }));
}

export function HotelProvider({ children }) {
  const { destination } = useDestination();
  const previousDestinationId = useRef(destination.id);
  const [itinerary, setItinerary] = useState(() => initialItinerary(destination));
  const [requests, setRequests] = useState(() => readRequests(destination.id));
  const [chatMessages, setChatMessages] = useState(() => readChatMessages(destination.id));
  const [flexSettings, setFlexSettings] = useState(() => readFlexSettings(destination));
  const [actionsTaken, setActionsTaken] = useState(() => readActions(destination.id));
  const [preferences, setPreferences] = useState(readPreferences);

  useEffect(() => {
    if (previousDestinationId.current === destination.id) return;
    previousDestinationId.current = destination.id;
    setItinerary(initialItinerary(destination));
    setRequests(readRequests(destination.id));
    setChatMessages(readChatMessages(destination.id));
    setFlexSettings(readFlexSettings(destination));
    setActionsTaken(readActions(destination.id));
  }, [destination]);

  const recordAction = useCallback((entry = {}) => {
    const item = {
      id: newId(),
      title: String(entry.title || "Activity recorded").slice(0, 160),
      detail: String(entry.detail || "").slice(0, 500),
      actor: ["Atithi AI", "Guest", "Front Desk", "System"].includes(entry.actor) ? entry.actor : "Atithi AI",
      createdAt,
      updatedAt: createdAt,
      ...(alreadyResolved ? { firstResponseAt: createdAt, resolvedAt: createdAt } : {}),
      destinationId: destination.id,
      ...(entry.requestId ? { requestId: entry.requestId } : {}),
      ...(entry.undoType ? { undoType: entry.undoType } : {}),
      ...(entry.createdRequestId ? { createdRequestId: entry.createdRequestId } : {}),
      ...(entry.beforeRequest ? { beforeRequest: entry.beforeRequest } : {}),
      ...(entry.beforeSettings ? { beforeSettings: entry.beforeSettings } : {}),
      ...(entry.canUndo === true ? { canUndo: true } : {}),
    };
    setActionsTaken((current) => {
      const next = [item, ...current].slice(0, 100);
      safeWrite(actionsKey(destination.id), next);
      return next;
    });
    return item;
  }, [destination.id]);

  const updatePreferences = useCallback((patch) => {
    setPreferences((previous) => {
      const next = { ...previous, ...patch };
      safeWrite(PROFILE_KEY, next);
      return next;
    });
  }, []);

  const addRequest = useCallback((request = {}) => {
    const createdAt = new Date().toISOString();
    const alreadyResolved = ["Approved by hotel", "Declined by hotel", "Approved by staff", "Declined by staff", "Auto-approved (demo)", "Staff takeover active", "Reviewed by staff"].includes(request.status);
    const item = {
      id: newId(),
      type: typeof request.type === "string" ? request.type.slice(0, 40) : "guest_request",
      status: typeof request.status === "string" ? request.status.slice(0, 60) : "Pending human review",
      title: String(request.title || "Guest request").slice(0, 140),
      category: String(request.category || "Front desk").slice(0, 60),
      detail: String(request.detail || "").slice(0, 1000),
      priority: request.priority === "urgent" ? "urgent" : "normal",
      createdAt: new Date().toISOString(),
      destinationId: destination.id,
      ...(typeof request.guestName === "string" ? { guestName: request.guestName.slice(0, 80) } : {}),
      ...(typeof request.kind === "string" ? { kind: request.kind } : {}),
      ...(typeof request.requestedTime === "string" ? { requestedTime: request.requestedTime } : {}),
      ...(request.offer && typeof request.offer === "object" ? { offer: request.offer } : {}),
      ...(request.aiSuggested === true ? { aiSuggested: true } : {}),
      ...(typeof request.aiSuggestionReason === "string" ? { aiSuggestionReason: request.aiSuggestionReason.slice(0, 300) } : {}),
      ...(typeof request.staffNote === "string" ? { staffNote: request.staffNote.slice(0, 500) } : {}),
      ...(typeof request.billLine === "string" ? { billLine: request.billLine.slice(0, 200) } : {}),
      ...(request.finalFee != null && Number.isFinite(Number(request.finalFee)) ? { finalFee: Number(request.finalFee) } : {}),
      ...(request.estimatedCommission != null && Number.isFinite(Number(request.estimatedCommission)) ? { estimatedCommission: Number(request.estimatedCommission) } : {}),
      ...(typeof request.approvedTime === "string" ? { approvedTime: request.approvedTime } : {}),
    };
    setRequests((current) => {
      const next = [item, ...current].slice(0, 80);
      safeWrite(requestsKey(destination.id), next);
      return next;
    });
    recordAction({
      title: item.type === "flex_stay" ? "Flex Stay request received" : item.type === "human_handoff" ? "Human handoff escalated" : item.type === "experience_booking" ? "Experience request received" : "Guest request logged",
      detail: item.title + " · " + item.status,
      actor: request.actionActor === "Guest" ? "Guest" : request.actionActor === "Front Desk" ? "Front Desk" : "Atithi AI",
      requestId: item.id, undoType: "delete_request", createdRequestId: item.id, canUndo: true,
    });
    return item;
  }, [destination.id, recordAction]);

  const updateRequest = useCallback((id, patch = {}) => {
    const allowed = ["status", "staffNote", "billLine", "counterOffer", "approvedTime", "finalFee", "takenOverBy", "offer", "requestedTime", "estimatedCommission", "aiSuggested", "aiSuggestionReason", "resolvedAt", "firstResponseAt"];
    const safePatch = {};
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(patch, key)) safePatch[key] = patch[key];
    const previous = requests.find((request) => request.id === id);
    if (!previous) return null;
    const now = new Date().toISOString();
    const nextRequest = { ...previous, ...safePatch, updatedAt: now };
    const responseChanged = (Object.prototype.hasOwnProperty.call(safePatch, "status") && safePatch.status !== previous.status) || (Object.prototype.hasOwnProperty.call(safePatch, "staffNote") && safePatch.staffNote !== previous.staffNote);
    if (responseChanged && !previous.firstResponseAt) nextRequest.firstResponseAt = now;
    if (["Approved by hotel", "Declined by hotel", "Approved by staff", "Declined by staff", "Auto-approved (demo)", "Staff takeover active", "Reviewed by staff"].includes(nextRequest.status)) nextRequest.resolvedAt = previous.resolvedAt || now;
    setRequests((current) => {
      const next = current.map((request) => request.id === id ? nextRequest : request);
      safeWrite(requestsKey(destination.id), next);
      return next;
    });
    recordAction({
      title: "Request updated: " + (nextRequest.title || nextRequest.category),
      detail: previous.status + " → " + nextRequest.status + (nextRequest.staffNote ? " · " + nextRequest.staffNote : ""),
      actor: "Front Desk", requestId: id, undoType: "restore_request", beforeRequest: previous, canUndo: true,
    });
    return nextRequest;
  }, [destination.id, requests, recordAction]);

  const updateRequestStatus = useCallback((id, status) => {
    const allowed = ["Pending human review", "Approved by staff", "Declined by staff", "Completed by staff", "Awaiting hotel approval", "Approved by hotel", "Declined by hotel", "Counter-offer sent", "Auto-approved (demo)", "Waiting for team", "Staff takeover active", "Reviewed by staff"];
    if (!allowed.includes(status)) return;
    return updateRequest(id, { status });
  }, [updateRequest]);

  const addChatMessage = useCallback((message = {}) => {
    const role = ["guest", "assistant", "staff"].includes(message.role) ? message.role : "assistant";
    const item = {
      id: newId(), role, text: String(message.text || "").slice(0, 1600), createdAt: new Date().toISOString(),
      ...(message.requestId ? { requestId: String(message.requestId) } : {}),
      ...(message.action?.type === "flex_stay_request" && ["early", "late"].includes(message.action.kind) && typeof message.action.time === "string" ? { action: { type: "flex_stay_request", kind: message.action.kind, time: message.action.time } } : {}),
    };
    setChatMessages((current) => {
      const next = [...current, item].slice(-100);
      safeWrite(chatKey(destination.id), next);
      return next;
    });
    if (role !== "guest") recordAction({
      title: role === "staff" ? "Front Desk replied to guest" : "Atithi replied to guest",
      detail: item.text.slice(0, 300), actor: role === "staff" ? "Front Desk" : "Atithi AI", requestId: message.requestId,
    });
    return item;
  }, [destination.id, recordAction]);

  const createFlexStayRequest = useCallback(({ kind, time, offer, guestName } = {}) => {
    const fee = offer?.fee != null && Number.isFinite(Number(offer.fee)) ? Number(offer.fee) : null;
    const auto = flexSettings.autoApproveEnabled && offer?.status === "available" && fee !== null && fee <= flexSettings.autoApproveUnder;
    let billLine;
    if (auto) {
      let amount = String(fee) + " " + destination.currency.code;
      try { amount = new Intl.NumberFormat(destination.locale, { style: "currency", currency: destination.currency.code }).format(fee); } catch { /* Use the ISO currency code as the fallback. */ }
      billLine = "Add " + amount + " to room bill (demo)";
    }
    return addRequest({
      type: "flex_stay",
      title: kind === "early" ? "Early check-in request" : "Late check-out request",
      category: "Flexible timing",
      detail: "Guest requested " + (kind === "early" ? "early check-in" : "late check-out") + " at " + time + ". " + String(offer?.reason || "Demo rules were evaluated.") + " This is not a booking.",
      status: auto ? "Auto-approved (demo)" : "Awaiting hotel approval",
      kind, requestedTime: time,
      offer: { status: offer?.status || "unavailable", fee, reason: String(offer?.reason || "").slice(0, 600) },
      guestName: guestName || "Demo guest",
      aiSuggested: true,
      aiSuggestionReason: "The deterministic Flex Stay rules evaluated the requested time; staff must confirm the room.",
      actionActor: "Atithi AI",
      ...(auto ? { finalFee: fee, approvedTime: time, billLine, staffNote: "Auto-approved by the demo setting; manually verify in a real hotel." } : {}),
    });
  }, [addRequest, destination.currency.code, destination.locale, flexSettings]);

  const undoAction = useCallback((actionId) => {
    const item = actionsTaken.find((action) => action.id === actionId);
    if (!item || item.canUndo !== true || item.undoneAt) return false;
    const now = new Date().toISOString();
    if (item.undoType === "delete_request" && item.createdRequestId) {
      setRequests((current) => { const next = current.filter((request) => request.id !== item.createdRequestId); safeWrite(requestsKey(destination.id), next); return next; });
    } else if (item.undoType === "restore_request" && item.beforeRequest) {
      setRequests((current) => { const next = current.map((request) => request.id === item.beforeRequest.id ? item.beforeRequest : request); safeWrite(requestsKey(destination.id), next); return next; });
    } else if (item.undoType === "restore_settings" && item.beforeSettings) {
      setFlexSettings(item.beforeSettings);
      safeWrite(settingsKey(destination.id), item.beforeSettings);
    } else { return false; }
    setActionsTaken((current) => {
      const next = [
        { id: newId(), title: "Undo: " + item.title, detail: "Reverted the previous demo action.", actor: "Front Desk", createdAt: now, destinationId: destination.id },
        ...current.map((action) => action.id === actionId ? { ...action, undoneAt: now, canUndo: false } : action),
      ].slice(0, 100);
      safeWrite(actionsKey(destination.id), next);
      return next;
    });
    return true;
  }, [actionsTaken, destination.id]);

  const updateFlexSettings = useCallback((patch = {}) => {
    const next = {
      ...flexSettings, ...patch,
      flexTiers: patch.flexTiers ? {
        early: Array.isArray(patch.flexTiers.early) ? patch.flexTiers.early.map((tier) => ({ from: tier.from, fee: Math.max(0, Number(tier.fee) || 0) })) : flexSettings.flexTiers.early,
        late: Array.isArray(patch.flexTiers.late) ? patch.flexTiers.late.map((tier) => ({ until: tier.until, fee: Math.max(0, Number(tier.fee) || 0) })) : flexSettings.flexTiers.late,
      } : flexSettings.flexTiers,
      cutoffs: patch.cutoffs ? { ...flexSettings.cutoffs, ...patch.cutoffs } : flexSettings.cutoffs,
      autoApproveEnabled: patch.autoApproveEnabled === undefined ? flexSettings.autoApproveEnabled : patch.autoApproveEnabled === true,
      autoApproveUnder: patch.autoApproveUnder === undefined ? flexSettings.autoApproveUnder : Math.max(0, Number(patch.autoApproveUnder) || 0),
      chefSpecial: patch.chefSpecial === undefined ? flexSettings.chefSpecial : String(patch.chefSpecial).slice(0, 500),
      hostPicks: patch.hostPicks ? { ...flexSettings.hostPicks, ...Object.fromEntries(Object.keys(flexSettings.hostPicks).map((key) => [key, patch.hostPicks[key] === undefined ? flexSettings.hostPicks[key] : patch.hostPicks[key] === true])) } : flexSettings.hostPicks,
      hostPickNotes: patch.hostPickNotes ? { ...flexSettings.hostPickNotes, ...Object.fromEntries(Object.keys(flexSettings.hostPickNotes).map((key) => [key, patch.hostPickNotes[key] === undefined ? flexSettings.hostPickNotes[key] : String(patch.hostPickNotes[key]).slice(0, 300)])) } : flexSettings.hostPickNotes,
    };
    setFlexSettings(next);
    safeWrite(settingsKey(destination.id), next);
    recordAction({ title: "Hotel settings updated", detail: "Flex Stay, chef's special or host-pick settings were changed.", actor: "Front Desk", undoType: "restore_settings", beforeSettings: flexSettings, canUndo: true });
  }, [destination.id, flexSettings, recordAction]);

  const resetDemoData = useCallback(() => {
    const welcomeFor = (destinationId) => [{ id: "welcome-" + destinationId, role: "assistant", text: WELCOME, createdAt: new Date().toISOString() }];
    for (const pack of DESTINATIONS) {
      safeWrite(requestsKey(pack.id), []);
      safeWrite(chatKey(pack.id), welcomeFor(pack.id));
      safeWrite(settingsKey(pack.id), defaultFlexSettings(pack));
      safeWrite(actionsKey(pack.id), []);
    }
    const currentWelcome = welcomeFor(destination.id);
    setRequests([]);
    setChatMessages(currentWelcome);
    setItinerary(initialItinerary(destination));
    setPreferences({ ...EMPTY_PREFERENCES });
    setFlexSettings(defaultFlexSettings(destination));
    const resetAction = [{ id: newId(), title: "Reset demo data", detail: "Demo requests, shared chat, action history and settings were reset across all destination packs.", actor: "System", createdAt: new Date().toISOString(), destinationId: destination.id }];
    setActionsTaken(resetAction);
    safeWrite(actionsKey(destination.id), resetAction);
    safeWrite(PROFILE_KEY, EMPTY_PREFERENCES);
  }, [destination]);

  const addItineraryStop = useCallback((place) => {
    if (!destination.places.some((candidate) => candidate.id === place?.id)) return;
    setItinerary((current) => current.some((stop) => stop.placeId === place.id)
      ? current
      : [...current, { id: place.id, placeId: place.id, title: place.name, note: "Added by guest · Demo itinerary", order: current.length + 1 }]);
  }, [destination.places]);

  const removeItineraryStop = useCallback((id) => {
    setItinerary((current) => current.filter((stop) => stop.id !== id).map((stop, index) => ({ ...stop, order: index + 1 })));
  }, []);

  const value = {
    itinerary, setItinerary, requests, addRequest, updateRequestStatus, updateRequest,
    preferences, updatePreferences, addItineraryStop, removeItineraryStop,
    chatMessages, addChatMessage, flexSettings, updateFlexSettings, createFlexStayRequest,
    resetDemoData, actionsTaken, undoAction, recordAction,
  };
  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
}

export function useHotelContext() {
  const value = useContext(HotelContext);
  if (!value) throw new Error("useHotelContext must be used inside HotelProvider");
  return value;
}
