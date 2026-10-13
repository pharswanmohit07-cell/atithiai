import React, { useMemo, useState } from "react";
import {
  Activity, BedDouble, Bot, CalendarClock, Check, ChefHat, ChevronRight,
  CircleDollarSign, Clock3, MessageCircle, RotateCcw, Settings2, ShieldAlert,
  Sparkles, Users, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useDestination } from "../context/DestinationContext.jsx";
import { useHotelContext } from "../context/HotelContext.jsx";
import ThemeToggle from "./ui/ThemeToggle.jsx";

const ACTIVE = new Set(["Pending human review", "Awaiting hotel approval", "Waiting for team", "Counter-offer sent"]);
const APPROVED_FLEX = new Set(["Approved by hotel", "Auto-approved (demo)"]);
const APPROVED_EXPERIENCE = new Set(["Approved by staff", "Approved by hotel", "Reviewed by staff", "Auto-approved (demo)"]);
const EXCLUDED_URGENT = new Set(["Approved by staff", "Declined by staff", "Approved by hotel", "Declined by hotel", "Staff takeover active", "Reviewed by staff"]);

function dateKey(value, timeZone) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).map(({ type, value: part }) => [type, part]));
    return p.year + "-" + p.month + "-" + p.day;
  } catch { return date.toISOString().slice(0, 10); }
}
function fmtDate(value, destination) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return "Time not recorded";
  try { return new Intl.DateTimeFormat(destination.locale, { dateStyle: "medium", timeStyle: "short", timeZone: destination.timezone }).format(date); }
  catch { return date.toLocaleString(); }
}
function fmtDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  const total = Math.round(milliseconds / 1000);
  if (total < 60) return total + " sec";
  const minutes = Math.floor(total / 60);
  return minutes < 60 ? minutes + "m " + (total % 60) + "s" : Math.floor(minutes / 60) + "h " + (minutes % 60) + "m";
}
function isExperience(request) {
  return request.type === "experience_booking" || /local experience|experience booking/i.test(request.category || "") || /experience booking inquiry/i.test(request.title || "");
}
function labelRequest(request) {
  if (request.type === "flex_stay") return request.kind === "early" ? "Early check-in" : "Late check-out";
  if (request.type === "human_handoff") return "Human handoff";
  if (isExperience(request)) return "Experience booking inquiry";
  if (request.priority === "urgent") return "Urgent request";
  return request.category || "Guest request";
}
function canShowInInbox(request) {
  return ACTIVE.has(request.status) || (request.priority === "urgent" && !EXCLUDED_URGENT.has(request.status));
}
function Metric({ title, note, icon: Icon, children }) {
  return <article className="min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-sm">
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-semibold leading-relaxed text-muted">{title}</p><p className="mt-1 text-[10px] leading-relaxed text-muted">{note}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-saffron"><Icon size={18}/></span></div>
    <div className="mt-3">{children}</div>
  </article>;
}
function Toggle({ checked, onChange, label, note }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg p-3"><div className="min-w-0"><p className="text-sm font-semibold">{label}</p>{note&&<p className="mt-1 text-xs leading-relaxed text-muted">{note}</p>}</div><button type="button" role="switch" aria-checked={checked} onClick={()=>onChange(!checked)} className={"min-h-10 shrink-0 rounded-lg px-3 py-2 text-xs font-bold "+(checked?"bg-brand text-white":"border border-border bg-surface text-text")}>{checked?"On":"Off"}</button></div>;
}
function InboxCard({ request, currency, formatDate, onAction, staffName }) {
  const [time,setTime]=useState(request.requestedTime||request.counterOffer?.time||"13:00");
  const [fee,setFee]=useState(String(request.finalFee??request.offer?.fee??request.counterOffer?.fee??0));
  const [note,setNote]=useState("happy to help");
  const flex=request.type==="flex_stay";
  const urgent=request.priority==="urgent";
  const dispatch=(action)=>onAction(request,action,{time,fee:Number(fee),note});
  return <article className={"rounded-2xl border bg-bg p-4 "+(urgent?"border-rose-300 dark:border-rose-900":"border-border")}>
    <div className="flex flex-wrap items-center gap-2">
      {urgent&&<span className="inline-flex items-center gap-1 rounded-full bg-rose-700 px-2 py-1 text-[9px] font-extrabold text-white"><ShieldAlert size={11}/>URGENT</span>}
      <h3 className="min-w-0 flex-1 text-sm font-bold">{request.title}</h3>
      {request.aiSuggested&&<span className="rounded-full border border-violet-300 bg-violet-50 px-2 py-1 text-[9px] font-extrabold text-violet-900 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-100"><Sparkles size={10} className="mr-1 inline"/>AI suggested</span>}
    </div>
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted"><span className="rounded-full border border-border px-2 py-1">{labelRequest(request)}</span><span className="rounded-full bg-surface-2 px-2 py-1">{request.status}</span><span>{formatDate(request.createdAt)}</span></div>
    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{request.detail}</p>
    {request.aiSuggested&&request.aiSuggestionReason&&<p className="mt-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-950 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100"><strong>Why suggested:</strong> {request.aiSuggestionReason}</p>}
    {request.counterOffer&&<p className="mt-2 text-xs font-semibold text-accent-text">Counter-offer: {request.counterOffer.time||"See note"}{request.counterOffer.fee!=null?" · "+currency(request.counterOffer.fee):""}{request.counterOffer.note?" · "+request.counterOffer.note:""}</p>}
    {request.staffNote&&<p className="mt-2 rounded-xl border border-border bg-surface p-3 text-sm leading-relaxed text-text">{request.staffNote}</p>}
    {request.billLine&&<p className="mt-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold">{request.billLine}</p>}
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="text-[10px] font-semibold text-muted">{flex?"Proposed local time":"Response plan"}{flex?<input type="time" step="1800" value={time} onChange={(e)=>setTime(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"/>:<span className="mt-1 block text-xs font-normal">Use the note below for a counterproposal.</span>}</label>
      {flex&&<label className="text-[10px] font-semibold text-muted">Proposed fee ({request.currencyCode||""})<input type="number" min="0" step="1" value={fee} onChange={(e)=>setFee(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"/></label>}
    </div>
    <label className="mt-3 block text-[10px] font-semibold text-muted">Message guest · signed as {staffName}<textarea value={note} onChange={(e)=>setNote(e.target.value)} maxLength={300} rows={2} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-text"/></label>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={()=>dispatch("approve")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white"><Check size={14}/>Approve</button>
      <button type="button" onClick={()=>dispatch("decline")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold text-text"><X size={14}/>Decline</button>
      <button type="button" onClick={()=>dispatch("counter")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold text-text"><RotateCcw size={14}/>Counter</button>
      <button type="button" onClick={()=>dispatch("message")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold text-text"><MessageCircle size={14}/>Message guest</button>
    </div>
  </article>;
}

export default function AdminDashboard({ onSwitch }) {
  const { user } = useAuth();
  const { destination, destinations, selectDestination, formatCurrency, weather, cachedDemoMode, setCachedDemoMode, weatherLoading, weatherError } = useDestination();
  const { requests, updateRequest, addRequest, chatMessages, addChatMessage, flexSettings, updateFlexSettings, actionsTaken, undoAction, resetDemoData } = useHotelContext();
  const [staffName,setStaffName]=useState(user?.name?.replace(/\s*\(demo\)$/i,"")||"Maria");
  const [conversationFilter,setConversationFilter]=useState("all");
  const [settingsOpen,setSettingsOpen]=useState(true);
  const today=dateKey(new Date(),destination.timezone);
  const currentRequests=requests.filter((request)=>request.destinationId===destination.id);
  const money=(value)=>formatCurrency(Number.isFinite(Number(value))?Number(value):0);
  const time=(value)=>fmtDate(value,destination);

  const flexApprovedToday=currentRequests.filter((request)=>request.type==="flex_stay"&&APPROVED_FLEX.has(request.status)&&dateKey(request.resolvedAt||request.updatedAt||request.createdAt,destination.timezone)===today);
  const flexRevenue=flexApprovedToday.reduce((sum,request)=>sum+Math.max(0,Number(request.finalFee??request.offer?.fee??0)||0),0);
  const approvedExperience=currentRequests.filter((request)=>isExperience(request)&&APPROVED_EXPERIENCE.has(request.status));
  const economics=destination.demoCommercials||{averageExperienceBookingValue:0,estimatedCommissionRate:0};
  const commissionPerRequest=Math.max(0,Number(economics.averageExperienceBookingValue)||0)*Math.max(0,Number(economics.estimatedCommissionRate)||0);
  const estimatedCommission=approvedExperience.reduce((sum,request)=>sum+(request.estimatedCommission!=null&&Number.isFinite(Number(request.estimatedCommission))?Math.max(0,Number(request.estimatedCommission)):commissionPerRequest),0);
  const aiReplies=chatMessages.filter((message)=>message.role==="assistant"&&!/^welcome\./i.test((message.text||"").trim())).length;
  const escalated=currentRequests.filter((request)=>request.type==="human_handoff").length;
  const responseDurations=currentRequests.map((request)=>{
    const responded=request.firstResponseAt||(request.updatedAt&&!ACTIVE.has(request.status)?request.updatedAt:null);
    const createdAt=new Date(request.createdAt).getTime();
    const responseAt=responded?new Date(responded).getTime():NaN;
    return responseAt>createdAt?responseAt-createdAt:null;
  }).filter((value)=>value!==null&&Number.isFinite(value));
  const averageResponse=responseDurations.length?responseDurations.reduce((sum,value)=>sum+value,0)/responseDurations.length:null;
  const roomsFreed=flexApprovedToday.filter((request)=>request.kind==="early").length;

  const inbox=useMemo(()=>requests.filter((request)=>request.destinationId===destination.id&&canShowInInbox(request)).sort((a,b)=>{
    const urgent=Number(b.priority==="urgent")-Number(a.priority==="urgent");
    if(urgent)return urgent;
    const typeOrder=(request)=>request.type==="flex_stay"?0:isExperience(request)?1:request.type==="human_handoff"?2:3;
    return typeOrder(a)-typeOrder(b)||String(b.createdAt).localeCompare(String(a.createdAt));
  }),[requests,destination.id]);
  const guestMessages=chatMessages;
  const visibleMessages=conversationFilter==="all"?guestMessages.slice(-30):guestMessages.filter((message)=>message.role===conversationFilter).slice(-30);

  const signedNote=(text)=>(staffName.trim()||"Front Desk")+" from Front Desk: "+(String(text||"").trim()||"I've reviewed your request. I'll follow up with the details.");
  const sendStaffMessage=(request,note,patch={})=>{
    const message=signedNote(note);
    updateRequest(request.id,{...patch,staffNote:message});
    addChatMessage({role:"staff",text:message,requestId:request.id});
  };
  const handleInboxAction=(request,action,values)=>{
    const message=signedNote(values.note);
    if(action==="message"){sendStaffMessage(request,values.note);return;}
    if(action==="counter"){
      const counterOffer=request.type==="flex_stay"?{time:values.time,fee:Math.max(0,Number(values.fee)||0),note:String(values.note||"").slice(0,300)}:{note:String(values.note||"").slice(0,300)};
      sendStaffMessage(request,values.note,{status:"Counter-offer sent",counterOffer});
      return;
    }
    if(action==="decline"){sendStaffMessage(request,values.note,{status:request.type==="flex_stay"?"Declined by hotel":"Declined by staff"});return;}
    if(action==="approve"){
      const patch=request.type==="flex_stay"
        ?{status:"Approved by hotel",approvedTime:values.time,finalFee:Math.max(0,Number(values.fee)||0),billLine:"Add "+money(Math.max(0,Number(values.fee)||0))+" to room bill (demo)",staffNote:message}
        :{status:"Approved by staff",staffNote:message};
      updateRequest(request.id,patch);
      addChatMessage({role:"staff",text:message,requestId:request.id});
    }
  };
  const takeOver=(sourceRequest)=>{
    const joined=(staffName.trim()||"Front Desk")+" (Front Desk) joined";
    let handoff=sourceRequest?.type==="human_handoff"?sourceRequest:currentRequests.find((request)=>request.type==="human_handoff"&&!["Staff takeover active","Declined by staff","Declined by hotel"].includes(request.status));
    if(!handoff){
      handoff=addRequest({type:"human_handoff",title:"Front desk took over guest conversation",category:"Human assistance",priority:"urgent",status:"Staff takeover active",detail:"Front desk takeover was started from the live conversation feed.",guestName:"Demo guest",staffNote:joined,takenOverBy:staffName.trim()||"Front Desk",actionActor:"Front Desk"});
    } else {
      updateRequest(handoff.id,{status:"Staff takeover active",takenOverBy:staffName.trim()||"Front Desk",staffNote:joined});
    }
    addChatMessage({role:"staff",text:joined,requestId:handoff.id});
  };
  const updateTier=(kind,index,key,value)=>{
    const next={...flexSettings.flexTiers,[kind]:flexSettings.flexTiers[kind].map((tier,i)=>i===index?{...tier,[key]:key==="fee"?Math.max(0,Number(value)||0):value}:tier)};
    updateFlexSettings({flexTiers:next});
  };
  const changeHostPick=(key,value)=>updateFlexSettings({hostPicks:{[key]:value}});
  const changeHostNote=(key,value)=>updateFlexSettings({hostPickNotes:{[key]:value}});

  return <main className="min-h-screen bg-bg text-text">
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent-text">Atithi AI · Front Desk</p><h1 className="mt-1 font-serif text-2xl sm:text-3xl">Front Desk &amp; Revenue</h1><p className="mt-1 text-xs text-muted">{destination.hotel.name} · {destination.city}, {destination.country} · demo workspace</p></div>
        <div className="flex flex-wrap items-center gap-2"><ThemeToggle compact/><label className="sr-only" htmlFor="fd-destination">Selected destination</label><select id="fd-destination" value={destination.id} onChange={(e)=>selectDestination(e.target.value)} className="min-h-10 max-w-44 rounded-xl border border-border bg-bg px-2 py-2 text-xs font-semibold text-text">{destinations.map((item)=><option key={item.id} value={item.id}>{item.city}</option>)}</select><button type="button" onClick={()=>setCachedDemoMode(!cachedDemoMode)} className="min-h-10 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-semibold text-text">{cachedDemoMode?"Cached demo: On":"Cached demo: Off"}</button><button type="button" onClick={onSwitch} className="min-h-10 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-semibold text-text">Switch persona</button></div>
      </div>
      <div className="mx-auto mt-2 flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted"><span className="inline-flex items-center gap-1.5"><span className={"h-2 w-2 rounded-full "+(weather?"bg-emerald-500":"bg-amber-500")}/>{weather?"Live weather":weatherLoading?"Weather loading":"Weather unavailable"}</span><span>{weather?weather.condition+" · "+weather.temperatureC+"°C":weatherError||"Room, request and revenue figures are demo data or estimates."}</span><span>{destination.timezone} · {destination.currency.code}</span></div>
    </header>
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 pb-12 sm:px-6 sm:py-7">
      <section className="overflow-hidden rounded-3xl bg-sunrise p-5 text-white shadow-sm sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/75">Hotel operations · {fmtDate(new Date(),destination)}</p><h2 className="mt-2 max-w-3xl font-serif text-3xl leading-tight sm:text-4xl">A clearer view of every guest request.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">One inbox for approvals, one shared guest conversation and a timestamped audit trail. All room, booking and commission figures are simulated or estimated.</p></div><div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-xs"><p className="font-bold">{destination.hotel.stars}-star demo hotel</p><p className="mt-1 text-white/80">{destination.hotel.rooms} rooms · {inbox.length} actions awaiting review</p></div></div></section>
      <section aria-label="Front desk metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title="Flex Stay revenue today" note="demo data · approved requests in local hotel day" icon={CircleDollarSign}><p className="font-serif text-3xl font-bold">{money(flexRevenue)}</p><p className="mt-1 text-[10px] text-muted">{flexApprovedToday.length} approved timing request{flexApprovedToday.length===1?"":"s"}</p></Metric>
        <Metric title="Estimated experience commissions" note="estimated · approved inquiries × demo pack rate" icon={Activity}><p className="font-serif text-3xl font-bold">{money(estimatedCommission)}</p><p className="mt-1 text-[10px] text-muted">{approvedExperience.length} approved experience request{approvedExperience.length===1?"":"s"} · not actual revenue</p></Metric>
        <Metric title="AI handled vs human escalated" note="demo data · stored conversation and handoff state" icon={Bot}><div className="grid grid-cols-2 gap-2"><div><p className="font-serif text-2xl font-bold">{aiReplies}</p><p className="text-[10px] text-muted">AI replies</p></div><div><p className="font-serif text-2xl font-bold">{escalated}</p><p className="text-[10px] text-muted">Human escalations</p></div></div></Metric>
        <Metric title="Average response time" note="estimated · request creation to first recorded response" icon={Clock3}><p className="font-serif text-3xl font-bold">{averageResponse===null?"—":fmtDuration(averageResponse)}</p><p className="mt-1 text-[10px] text-muted">From {responseDurations.length} request timestamp pair{responseDurations.length===1?"":"s"}</p></Metric>
        <Metric title="Rooms freed for early check-in" note="estimated · approved early arrivals today" icon={BedDouble}><p className="font-serif text-3xl font-bold">{roomsFreed}</p><p className="mt-1 text-[10px] text-muted">No live room inventory connected</p></Metric>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">Needs your approval</h2><p className="mt-1 text-xs leading-relaxed text-muted">Urgent items first. Approvals record a demo decision only; they do not reserve a room or book an external provider.</p></div><span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-extrabold">{inbox.length} waiting</span></div>
        {inbox.length===0?<div className="mt-4 rounded-xl border border-dashed border-border bg-bg p-5"><p className="text-sm font-semibold">All caught up.</p><p className="mt-1 text-xs text-muted">New Flex Stay requests, experience enquiries and handoffs will appear here.</p></div>:<div className="mt-4 space-y-3">{inbox.map((request)=><InboxCard key={request.id} request={request} currency={money} formatDate={time} onAction={handleInboxAction} staffName={staffName.trim()||"Front Desk"}/>)}</div>}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-saffron"><MessageCircle size={18}/></span><h2 className="font-serif text-2xl">Live guest conversation</h2></div><p className="mt-1 text-xs text-muted">Shared local demo chat · {guestMessages.length} stored messages · {guestMessages.filter((message)=>message.role==="guest").length} guest messages</p></div><div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="conversation-filter">Conversation filter</label><select id="conversation-filter" value={conversationFilter} onChange={(e)=>setConversationFilter(e.target.value)} className="min-h-10 rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text"><option value="all">All messages</option><option value="guest">Guest only</option><option value="assistant">Atithi AI only</option><option value="staff">Front Desk only</option></select><button type="button" onClick={()=>takeOver(null)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white"><Users size={14}/>Take over</button></div></div>
        {visibleMessages.length===0?<p className="mt-4 rounded-xl bg-bg p-4 text-sm text-muted">No conversation messages for this filter.</p>:<div className="mt-4 max-h-[440px] space-y-2 overflow-y-auto rounded-xl bg-bg p-3">{visibleMessages.map((message)=><article key={message.id} className={"max-w-[95%] rounded-xl border px-3 py-2.5 sm:max-w-[80%] "+(message.role==="guest"?"ml-auto border-brand/20 bg-brand text-white":message.role==="staff"?"border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100":"border-border bg-surface text-text")}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-extrabold uppercase tracking-wide">{message.role==="guest"?"Guest":message.role==="staff"?"Front Desk":"Atithi AI"}</p><time className="text-[9px] opacity-70">{time(message.createdAt)}</time></div><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p></article>)}</div>}
        <p className="mt-3 text-[10px] leading-relaxed text-muted">Take over records a front-desk join message in the shared chat. It is a demo handoff, not a live messaging connection.</p>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-saffron"><Activity size={18}/></span><h2 className="font-serif text-2xl">Actions taken by Atithi</h2></div><p className="mt-1 text-xs text-muted">Timestamped activity log. Undo is available for request and settings changes with a saved prior state.</p></div><span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold">{actionsTaken.length}</span></div>
        {actionsTaken.length===0?<p className="mt-4 rounded-xl bg-bg p-4 text-sm text-muted">No actions recorded yet.</p>:<div className="mt-4 space-y-2">{actionsTaken.slice(0,30).map((action)=><article key={action.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-bg p-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{action.title}</p><span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted">{action.actor}</span>{action.undoneAt&&<span className="text-[9px] font-bold text-muted">UNDONE</span>}</div><p className="mt-1 break-words text-xs leading-relaxed text-muted">{action.detail}</p><time className="mt-1 block text-[10px] text-muted">{time(action.createdAt)}</time></div>{action.canUndo&&!action.undoneAt&&<button type="button" onClick={()=>undoAction(action.id)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold"><RotateCcw size={13}/>Undo</button>}</article>)}</div>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <button type="button" aria-expanded={settingsOpen} onClick={()=>setSettingsOpen((open)=>!open)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"><span className="flex items-center gap-2"><Settings2 size={19}/><span><span className="block font-serif text-2xl">Hotel settings</span><span className="mt-1 block text-xs text-muted">Flex Stay, chef's special and host picks · saved on this browser</span></span></span><ChevronRight size={19} className={"transition-transform "+(settingsOpen?"rotate-90":"")}/></button>
        {settingsOpen&&<div className="space-y-5 border-t border-border p-4 sm:p-5">
          <div><h3 className="text-sm font-bold">Early check-in tiers</h3><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{flexSettings.flexTiers.early.map((tier,index)=><div key={"early-"+index} className="grid grid-cols-2 gap-2 rounded-xl bg-bg p-3"><label className="text-xs font-semibold text-muted">Available from<input type="time" value={tier.from} onChange={(e)=>updateTier("early",index,"from",e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm text-text"/></label><label className="text-xs font-semibold text-muted">Fee ({destination.currency.code})<input type="number" min="0" value={tier.fee} onChange={(e)=>updateTier("early",index,"fee",e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm text-text"/></label></div>)}</div></div>
          <div><h3 className="text-sm font-bold">Late check-out tiers</h3><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{flexSettings.flexTiers.late.map((tier,index)=><div key={"late-"+index} className="grid grid-cols-2 gap-2 rounded-xl bg-bg p-3"><label className="text-xs font-semibold text-muted">Available until<input type="time" value={tier.until} onChange={(e)=>updateTier("late",index,"until",e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm text-text"/></label><label className="text-xs font-semibold text-muted">Fee ({destination.currency.code})<input type="number" min="0" value={tier.fee} onChange={(e)=>updateTier("late",index,"fee",e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm text-text"/></label></div>)}</div></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-muted">Earliest early check-in<input type="time" value={flexSettings.cutoffs.earlyEarliest} onChange={(e)=>updateFlexSettings({cutoffs:{...flexSettings.cutoffs,earlyEarliest:e.target.value}})} className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"/></label><label className="text-xs font-semibold text-muted">Latest late check-out<input type="time" value={flexSettings.cutoffs.lateLatest} onChange={(e)=>updateFlexSettings({cutoffs:{...flexSettings.cutoffs,lateLatest:e.target.value}})} className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"/></label></div>
          <div className="rounded-xl border border-border bg-bg p-3"><Toggle checked={flexSettings.autoApproveEnabled} onChange={(value)=>updateFlexSettings({autoApproveEnabled:value})} label="Auto-approve under X" note="OFF by default. Demo-only; this does not operate live inventory or payments."/><label className="mt-3 block text-xs font-semibold text-muted">Threshold ({destination.currency.code})<input type="number" min="0" value={flexSettings.autoApproveUnder} onChange={(e)=>updateFlexSettings({autoApproveUnder:Math.max(0,Number(e.target.value)||0)})} className="mt-1 min-h-10 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text sm:max-w-xs"/></label></div>
          <div><h3 className="flex items-center gap-2 text-sm font-bold"><ChefHat size={17}/>Chef's special</h3><p className="mt-1 text-xs text-muted">Saved text for later guest food-discovery features; it does not confirm live availability.</p><textarea value={flexSettings.chefSpecial} onChange={(e)=>updateFlexSettings({chefSpecial:e.target.value})} maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"/></div>
          <div><h3 className="text-sm font-bold">Host picks</h3><p className="mt-1 text-xs text-muted">These switches and notes are persisted for future guest recommendations.</p><div className="mt-3 space-y-3">
            <div><Toggle checked={flexSettings.hostPicks.localExperiences} onChange={(value)=>changeHostPick("localExperiences",value)} label="Recommend local experiences" note="Destination-pack demo listings only."/><label className="mt-2 block text-xs font-semibold text-muted">Experience note<textarea value={flexSettings.hostPickNotes.localExperiences} onChange={(e)=>changeHostNote("localExperiences",e.target.value)} maxLength={300} rows={2} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm font-normal text-text"/></label></div>
            <div><Toggle checked={flexSettings.hostPicks.localFood} onChange={(value)=>changeHostPick("localFood",value)} label="Recommend local food" note="Use destination-pack dishes and confirm ingredients/allergens."/><label className="mt-2 block text-xs font-semibold text-muted">Food note<textarea value={flexSettings.hostPickNotes.localFood} onChange={(e)=>changeHostNote("localFood",e.target.value)} maxLength={300} rows={2} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm font-normal text-text"/></label></div>
            <div><Toggle checked={flexSettings.hostPicks.quieterPlaces} onChange={(value)=>changeHostPick("quieterPlaces",value)} label="Prioritize quieter places" note="Use estimated quieter-place tags from the destination pack."/></div>
            <label className="block text-xs font-semibold text-muted">Quieter-place note<textarea value={flexSettings.hostPickNotes.quieterPlaces} onChange={(e)=>changeHostNote("quieterPlaces",e.target.value)} maxLength={300} rows={2} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm font-normal text-text"/></label>
          </div></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="max-w-2xl text-xs leading-relaxed text-muted">Reset clears demo requests, shared conversation, activity history and saved settings for all destination packs in this browser.</p><button type="button" onClick={resetDemoData} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300 px-4 py-3 text-sm font-bold text-rose-800 dark:border-rose-900 dark:text-rose-200"><RotateCcw size={15}/>Reset demo data</button></div>
        </div>}
      </section>
      <footer className="text-[10px] leading-relaxed text-muted">Demo &amp; estimate notice: only weather is live. Room readiness, bookings, commissions and request status are simulated browser-local data. Currency and timestamps follow {destination.locale} / {destination.timezone}.</footer>
    </div>
  </main>;
}
