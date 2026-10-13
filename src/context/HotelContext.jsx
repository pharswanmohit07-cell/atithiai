import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useDestination } from "./DestinationContext.jsx";

const HotelContext = createContext(null);
const PROFILE_KEY = "atithi-guest-preferences";
const EMPTY_PREFERENCES = { language: "English", dietaryPreference: "No preference", travelParty: "Family" };
const DIETARY_OPTIONS = ["No preference", "Vegetarian", "Vegan", "Pescatarian", "Halal", "Gluten-free", "Dairy-free", "Other — ask me"];
const PARTY_OPTIONS = ["Family", "Solo", "Couple", "Friends", "Business"];

function readPreferences() {
  const saved = safeRead(PROFILE_KEY, {});
  return {
    ...EMPTY_PREFERENCES,
    language: typeof saved.language === "string" && saved.language.trim() ? (saved.language === "en" ? "English" : saved.language.trim().slice(0, 50)) : "English",
    dietaryPreference: DIETARY_OPTIONS.includes(saved.dietaryPreference) ? saved.dietaryPreference : "No preference",
    travelParty: PARTY_OPTIONS.includes(saved.travelParty) ? saved.travelParty : "Family",
  };
}

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}


const REQUESTS_KEY = (id) => "atithi-requests:" + id;
const CHAT_KEY = (id) => "atithi-chat:" + id;
const FLEX_KEY = (id) => "atithi-flex-settings:" + id;
function safeWrite(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Session state remains available. */ } }
function newId() { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2); }
function defaultFlexSettings(destination) {
  return { flexTiers: { early: (destination.hotel.flexTiers?.early || []).map((t) => ({ from: t.from, fee: Number(t.fee) })), late: (destination.hotel.flexTiers?.late || []).map((t) => ({ until: t.until, fee: Number(t.fee) })) }, cutoffs: { earlyEarliest: destination.hotel.flexCutoffs?.earlyEarliest || "10:00", lateLatest: destination.hotel.flexCutoffs?.lateLatest || "15:00" }, autoApproveEnabled: false, autoApproveUnder: 0 };
}
function readFlexSettings(destination) {
  const base = defaultFlexSettings(destination); const saved = safeRead(FLEX_KEY(destination.id), {});
  const validTime = (v) => typeof v === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
  const early = Array.isArray(saved?.flexTiers?.early) && saved.flexTiers.early.length ? saved.flexTiers.early : base.flexTiers.early;
  const late = Array.isArray(saved?.flexTiers?.late) && saved.flexTiers.late.length ? saved.flexTiers.late : base.flexTiers.late;
  return { flexTiers: {
    early: early.map((t,i) => ({ from: validTime(t.from) ? t.from : (base.flexTiers.early[i]?.from || base.flexTiers.early[base.flexTiers.early.length-1].from), fee: Number.isFinite(Number(t.fee)) && Number(t.fee)>=0 ? Number(t.fee) : (base.flexTiers.early[i]?.fee || 0) })),
    late: late.map((t,i) => ({ until: validTime(t.until) ? t.until : (base.flexTiers.late[i]?.until || base.flexTiers.late[base.flexTiers.late.length-1].until), fee: Number.isFinite(Number(t.fee)) && Number(t.fee)>=0 ? Number(t.fee) : (base.flexTiers.late[i]?.fee || 0) })),
  }, cutoffs: { earlyEarliest: validTime(saved?.cutoffs?.earlyEarliest) ? saved.cutoffs.earlyEarliest : base.cutoffs.earlyEarliest, lateLatest: validTime(saved?.cutoffs?.lateLatest) ? saved.cutoffs.lateLatest : base.cutoffs.lateLatest }, autoApproveEnabled: saved.autoApproveEnabled === true, autoApproveUnder: Number.isFinite(Number(saved.autoApproveUnder)) && Number(saved.autoApproveUnder)>=0 ? Number(saved.autoApproveUnder) : 0 };
}
function readRequests(id) { const v = safeRead(REQUESTS_KEY(id), []); return Array.isArray(v) ? v.filter((r) => r && r.destinationId === id && typeof r.id === "string").slice(0,80) : []; }
function readChatMessages(id) { const v = safeRead(CHAT_KEY(id), null); return Array.isArray(v) ? v.filter((m) => m && typeof m.text === "string").slice(-100) : [{ id:"welcome-"+id, role:"assistant", text:"Welcome. I’m your hotel co-host for this demo stay. Ask about local experiences, food, weather or a request for the team.", createdAt:new Date().toISOString() }]; }

function initialItinerary(destination) {
  return destination.places.slice(0, 4).map((place, index) => ({
    id: place.id,
    placeId: place.id,
    title: place.name,
    note: "Suggested stop · Demo itinerary",
    order: index + 1,
  }));
}

export function HotelProvider({ children }) {
  const { destination } = useDestination();
  const previousDestinationId = useRef(destination.id);
  const [itinerary, setItinerary] = useState(() => initialItinerary(destination));
  const [requests, setRequests] = useState(() => readRequests(destination.id));
  const [chatMessages, setChatMessages] = useState(() => readChatMessages(destination.id));
  const [flexSettings, setFlexSettings] = useState(() => readFlexSettings(destination));
  const [preferences, setPreferences] = useState(readPreferences);

  useEffect(() => {
    if (previousDestinationId.current === destination.id) return;
    previousDestinationId.current = destination.id;
    setItinerary(initialItinerary(destination));
    setRequests(readRequests(destination.id));
    setChatMessages(readChatMessages(destination.id));
    setFlexSettings(readFlexSettings(destination));
  }, [destination]);

  const updatePreferences = useCallback((patch) => {
    setPreferences((previous) => {
      const next = { ...previous, ...patch };
      safeWrite(PROFILE_KEY, next);
      return next;
    });
  }, []);

  const addRequest = useCallback((request) => {
    const item = {
      id: newId(),
      type: typeof request?.type === "string" ? request.type.slice(0, 40) : "guest_request",
      status: typeof request?.status === "string" ? request.status.slice(0, 60) : "Pending human review",
      title: String(request?.title || "Guest request").slice(0, 140),
      category: String(request?.category || "Front desk").slice(0, 60),
      detail: String(request?.detail || "").slice(0, 1000),
      status: "Pending human review",
      priority: request?.priority === "urgent" ? "urgent" : "normal",
      createdAt: new Date().toISOString(),
      destinationId: destination.id,
      ...(typeof request?.guestName === "string" ? { guestName: request.guestName.slice(0, 80) } : {}),
      ...(typeof request?.kind === "string" ? { kind: request.kind } : {}),
      ...(typeof request?.requestedTime === "string" ? { requestedTime: request.requestedTime } : {}),
      ...(request?.offer && typeof request.offer === "object" ? { offer: request.offer } : {}),
    };
    setRequests((current) => { const next = [item, ...current].slice(0, 80); safeWrite(REQUESTS_KEY(destination.id), next); return next; });
    return item;
  }, [destination.id]);

  const updateRequestStatus = useCallback((id, status) => {
    const allowed = ["Pending human review", "Approved by staff", "Declined by staff", "Completed by staff", "Awaiting hotel approval", "Approved by hotel", "Declined by hotel", "Counter-offer sent", "Auto-approved (demo)", "Waiting for team", "Staff takeover active"];
    if (!allowed.includes(status)) return;
    setRequests((current) => { const next = current.map((request) => request.id === id ? { ...request, status } : request); safeWrite(REQUESTS_KEY(destination.id), next); return next; });
  }, [destination.id]);


  const updateRequest = useCallback((id, patch = {}) => {
    const allowed = ["status","staffNote","billLine","counterOffer","approvedTime","finalFee","takenOverBy","offer","requestedTime"];
    const safePatch = {}; for (const key of allowed) if (Object.prototype.hasOwnProperty.call(patch,key)) safePatch[key] = patch[key];
    setRequests((current) => { const next = current.map((r) => r.id === id ? { ...r, ...safePatch, updatedAt: new Date().toISOString() } : r); safeWrite(REQUESTS_KEY(destination.id), next); return next; });
  }, [destination.id]);
  const addChatMessage = useCallback((message = {}) => {
    const item = { id:newId(), role:["guest","assistant","staff"].includes(message.role) ? message.role : "assistant", text:String(message.text || "").slice(0,1600), createdAt:new Date().toISOString(), ...(message.requestId ? { requestId:String(message.requestId) } : {}), ...(message.action?.type==="flex_stay_request" && ["early","late"].includes(message.action.kind) && typeof message.action.time==="string" ? { action:{type:"flex_stay_request",kind:message.action.kind,time:message.action.time} } : {}) };
    setChatMessages((current) => { const next = [...current,item].slice(-100); safeWrite(CHAT_KEY(destination.id),next); return next; }); return item;
  }, [destination.id]);
  const createFlexStayRequest = useCallback(({ kind, time, offer, guestName } = {}) => {
    const fee = Number.isFinite(Number(offer?.fee)) ? Number(offer.fee) : null;
    const auto = flexSettings.autoApproveEnabled && offer?.status==="available" && fee!==null && fee<=flexSettings.autoApproveUnder;
    let billLine;
    if (auto) { let amount = String(fee)+" "+destination.currency.code; try { amount = new Intl.NumberFormat(destination.locale,{style:"currency",currency:destination.currency.code}).format(fee); } catch { /* ISO currency code fallback. */ } billLine = "Add "+amount+" to room bill (demo)"; }
    return addRequest({ type:"flex_stay", title:kind==="early"?"Early check-in request":"Late check-out request", category:"Flexible timing", detail:"Guest requested "+(kind==="early"?"early check-in":"late check-out")+" at "+time+". "+String(offer?.reason||"Demo rules were evaluated.")+" This is not a booking.", status:auto?"Auto-approved (demo)":"Awaiting hotel approval", kind, requestedTime:time, offer:{status:offer?.status||"unavailable",fee,reason:String(offer?.reason||"").slice(0,600)}, guestName:guestName||"Demo guest", ...(auto?{finalFee:fee,approvedTime:time,billLine,staffNote:"Auto-approved by the demo setting; verify manually in a real hotel."}:{}) });
  }, [addRequest,destination.currency.code,destination.locale,flexSettings]);
  const updateFlexSettings = useCallback((patch = {}) => {
    const next = { ...flexSettings, ...patch,
      flexTiers: patch.flexTiers ? {
        early: Array.isArray(patch.flexTiers.early) ? patch.flexTiers.early.map((t)=>({from:t.from,fee:Math.max(0,Number(t.fee)||0)})) : flexSettings.flexTiers.early,
        late: Array.isArray(patch.flexTiers.late) ? patch.flexTiers.late.map((t)=>({until:t.until,fee:Math.max(0,Number(t.fee)||0)})) : flexSettings.flexTiers.late,
      } : flexSettings.flexTiers,
      cutoffs: patch.cutoffs ? {...flexSettings.cutoffs,...patch.cutoffs} : flexSettings.cutoffs,
      autoApproveEnabled: patch.autoApproveEnabled===undefined ? flexSettings.autoApproveEnabled : patch.autoApproveEnabled===true,
      autoApproveUnder: patch.autoApproveUnder===undefined ? flexSettings.autoApproveUnder : Math.max(0,Number(patch.autoApproveUnder)||0),
    };
    setFlexSettings(next); safeWrite(FLEX_KEY(destination.id),next);
  }, [destination.id,flexSettings]);
  const resetDemoData = useCallback(() => {
    const clean = defaultFlexSettings(destination);
    const welcome = [{id:"welcome-"+destination.id,role:"assistant",text:"Welcome. I’m your hotel co-host for this demo stay. Ask about local experiences, food, weather or a request for the team.",createdAt:new Date().toISOString()}];
    setRequests([]); setChatMessages(welcome); setItinerary(initialItinerary(destination)); setPreferences({...EMPTY_PREFERENCES}); setFlexSettings(clean);
    safeWrite(REQUESTS_KEY(destination.id),[]); safeWrite(CHAT_KEY(destination.id),welcome); safeWrite(FLEX_KEY(destination.id),clean); safeWrite(PROFILE_KEY,EMPTY_PREFERENCES);
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
    chatMessages, addChatMessage, flexSettings, updateFlexSettings, createFlexStayRequest, resetDemoData,
  };
  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
}

export function useHotelContext() {
  const value = useContext(HotelContext);
  if (!value) throw new Error("useHotelContext must be used inside HotelProvider");
  return value;
}
