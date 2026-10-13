import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Globe2, Heart, Languages, SlidersHorizontal, Users } from "lucide-react";
import { useProfile, PROFILE_DIETS, PROFILE_INTERESTS, PROFILE_LANGUAGES } from "../context/ProfileContext.jsx";\nimport ThemeToggle from "./ui/ThemeToggle.jsx";\nimport IconBadge from "./ui/IconBadge.jsx";

const panel = "rounded-2xl border border-border bg-surface p-4 sm:p-5";
const INTEREST_DETAILS = {
  nature: "Nature & landscapes", food: "Local food", culture: "Culture & stories",
  craft: "Craft & makers", wellness: "Wellness", nightlife: "Nightlife", quiet: "Quiet corners"
};
const BUDGET_DETAILS = {
  low: "Low · value-focused", medium: "Medium · balanced", high: "High · flexible"
};
const PACE_DETAILS = {
  relaxed: "Relaxed", balanced: "Balanced", packed: "Packed day"
};
const PARTY_DETAILS = {
  solo: "Solo", couple: "Couple", family: "Family", friends: "Friends"
};
const LANGUAGE_NAMES = Object.fromEntries(PROFILE_LANGUAGES.map((language) => [language.code, language.label]));

function ChoiceChip({ active, children, onClick }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={"min-h-10 rounded-full border px-3 py-2 text-xs font-bold transition-colors " + (active ? "border-transparent bg-brand text-white" : "border-border bg-bg text-text hover:bg-surface-2")}>{children}</button>;
}
function InterestChoices({ profile, toggleInterest }) {
  return <div className="flex flex-wrap gap-2">{PROFILE_INTERESTS.map((interest) => <ChoiceChip key={interest} active={profile.interests.includes(interest)} onClick={() => toggleInterest(interest)}>{INTEREST_DETAILS[interest]}</ChoiceChip>)}</div>;
}
function LanguageChoices({ profile, toggleLanguage }) {
  return <div className="flex flex-wrap gap-2">{PROFILE_LANGUAGES.map((language) => {
    const active = profile.languages.includes(language.code);
    const disabled = !active && profile.languages.length >= 3;
    return <ChoiceChip key={language.code} active={active} onClick={() => toggleLanguage(language.code)}>{language.label}{active ? " ✓" : ""}{disabled ? " · max 3" : ""}</ChoiceChip>;
  })}</div>;
}
function FoodAndBudget({ profile, updateProfile, currencyCode }) {
  return <div className="space-y-4">
    <label className="block text-xs font-bold text-muted">Dietary preference<select value={profile.diet} onChange={(event) => updateProfile({ diet: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text">{PROFILE_DIETS.map((diet) => <option key={diet.value} value={diet.value}>{diet.label}</option>)}</select></label>
    <div><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-muted">Spice tolerance</p><span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold">{profile.spiceTolerance} / 3</span></div><input type="range" min="1" max="3" step="1" value={profile.spiceTolerance} onChange={(event) => updateProfile({ spiceTolerance: Number(event.target.value) })} className="mt-2 w-full"/><div className="flex justify-between text-[10px] text-muted"><span>Mild</span><span>Medium</span><span>Hot</span></div></div>
    <label className="block text-xs font-bold text-muted">Daily budget<select value={profile.dailyBudget.level} onChange={(event) => updateProfile({ dailyBudget: { level: event.target.value } })} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text">{Object.entries(BUDGET_DETAILS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="block text-xs font-bold text-muted">Optional daily amount ({currencyCode})<input type="number" min="0" step="any" value={profile.dailyBudget.amount !== null && profile.dailyBudget.currencyCode !== currencyCode ? "" : profile.dailyBudget.amount ?? ""} onChange={(event) => updateProfile({ dailyBudget: { amount: event.target.value === "" ? null : Number(event.target.value), currencyCode } })} placeholder="Leave blank for no numeric limit" className="mt-1 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm font-normal text-text"/></label>{profile.dailyBudget.amount !== null && profile.dailyBudget.currencyCode !== currencyCode && <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-200">Your previous amount was entered in {profile.dailyBudget.currencyCode || "an unspecified currency"}. Enter a new amount in {currencyCode} to use a numeric budget for this destination.</p>}
    <p className="text-[10px] leading-relaxed text-muted">The amount is interpreted in the selected destination's local currency. All pack costs are illustrative estimates, not current quotes.</p>
  </div>;
}
function PaceAndParty({ profile, updateProfile }) {
  return <div className="space-y-4">
    <fieldset><legend className="mb-2 text-xs font-bold text-muted">Your pace</legend><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{Object.entries(PACE_DETAILS).map(([value,label]) => <ChoiceChip key={value} active={profile.pace === value} onClick={() => updateProfile({ pace: value })}>{label}</ChoiceChip>)}</div></fieldset>
    <fieldset><legend className="mb-2 text-xs font-bold text-muted">Who are you travelling with?</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(PARTY_DETAILS).map(([value,label]) => <ChoiceChip key={value} active={profile.travelParty === value} onClick={() => updateProfile({ travelParty: value })}>{label}</ChoiceChip>)}</div></fieldset>
    <button type="button" role="switch" aria-checked={profile.avoidCrowds} onClick={() => updateProfile({ avoidCrowds: !profile.avoidCrowds })} className={"flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border p-3 text-left " + (profile.avoidCrowds ? "border-brand bg-brand/5" : "border-border bg-bg")}><span><span className="block text-sm font-bold">Prefer fewer crowds</span><span className="mt-1 block text-[10px] text-muted">Uses estimated crowd levels from the destination pack.</span></span><span className={"inline-flex h-6 w-11 items-center rounded-full p-1 " + (profile.avoidCrowds ? "bg-brand" : "bg-surface-2")}><span className={"h-4 w-4 rounded-full bg-white transition-transform " + (profile.avoidCrowds ? "translate-x-5" : "")}/></span></button>
  </div>;
}
function ProfileEditor({ profile, updateProfile, toggleInterest, toggleLanguage, currencyCode }) {
  return <div className="space-y-5">
    <section className={panel}><div className="flex items-center gap-2"><Heart size={18} className="text-accent-text"/><h2 className="font-serif text-2xl">What draws you in?</h2></div><p className="mb-3 mt-1 text-xs text-muted">Select as many interests as you like.</p><InterestChoices profile={profile} toggleInterest={toggleInterest}/></section>
    <section className={panel}><div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-accent-text"/><h2 className="font-serif text-2xl">Food and budget</h2></div><div className="mt-3"><FoodAndBudget profile={profile} updateProfile={updateProfile} currencyCode={currencyCode}/></div></section>
    <section className={panel}><div className="flex items-center gap-2"><Users size={18} className="text-accent-text"/><h2 className="font-serif text-2xl">How you like to travel</h2></div><div className="mt-3"><PaceAndParty profile={profile} updateProfile={updateProfile}/></div></section>
    <section className={panel}><div className="flex items-center gap-2"><Languages size={18} className="text-accent-text"/><h2 className="font-serif text-2xl">Languages</h2></div><p className="mb-3 mt-1 text-xs text-muted">Choose up to three. Chat still detects the language you write in unless you force a reply language.</p><LanguageChoices profile={profile} toggleLanguage={toggleLanguage}/></section>
  </div>;
}

export function ProfileOnboarding({ destination, onFinish }) {
  const { profile, updateProfile, toggleInterest, toggleLanguage, finishOnboarding } = useProfile();
  const [step, setStep] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const steps = [
    { kicker:"Step 1 of 4", title:"What makes you curious?", copy:"Choose the things you naturally drift toward. There are no wrong answers." },
    { kicker:"Step 2 of 4", title:"Let's make food and spending feel right.", copy:"These preferences shape ideas, not guarantees about ingredients or prices." },
    { kicker:"Step 3 of 4", title:"Find your own rhythm.", copy:"A gentle wandering day and a packed day can both be wonderful." },
    { kicker:"Step 4 of 4", title:"Which languages feel comfortable?", copy:"Choose up to three. You can change them at any time in Profile." }
  ];
  const finish = () => { finishOnboarding(); onFinish(); };
  const next = () => step < 3 ? setStep((value) => value + 1) : finish();
  const previous = () => setStep((value) => Math.max(0, value - 1));
  const swipeStart = (event) => setTouchStart(event.changedTouches?.[0]?.clientX ?? null);
  const swipeEnd = (event) => {
    if (touchStart == null) return;
    const delta = (event.changedTouches?.[0]?.clientX ?? touchStart) - touchStart;
    if (delta < -60 && step < 3) setStep((value) => value + 1);
    if (delta > 60 && step > 0) setStep((value) => value - 1);
    setTouchStart(null);
  };
  return <main className="min-h-screen bg-bg px-4 py-5 text-text sm:px-6 sm:py-8"><div className="mx-auto max-w-2xl">
    <header className="flex items-center justify-between gap-3"><div><p className="font-serif text-2xl">Atithi AI</p><p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">Make it personal</p></div><button type="button" onClick={finish} className="min-h-10 rounded-xl px-3 py-2 text-xs font-bold text-muted">Skip for now</button></header>
    <div className="mt-6 flex gap-1.5" aria-label={"Onboarding progress, step "+(step+1)+" of 4"}>{steps.map((item,index)=><span key={item.kicker} className={"h-1.5 flex-1 rounded-full "+(index<=step?"bg-brand":"bg-surface-2")}/>)}</div>
    <div className="mt-5 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7" onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
      <AnimateStep step={step}><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-accent-text">{steps[step].kicker} · {destination.city}</p><h1 className="mt-2 font-serif text-3xl sm:text-4xl">{steps[step].title}</h1><p className="mt-2 text-sm leading-relaxed text-muted">{steps[step].copy}</p>
        {step===0&&<div className="mt-5"><InterestChoices profile={profile} toggleInterest={toggleInterest}/></div>}
        {step===1&&<div className="mt-5"><FoodAndBudget profile={profile} updateProfile={updateProfile} currencyCode={destination.currency.code}/></div>}
        {step===2&&<div className="mt-5"><PaceAndParty profile={profile} updateProfile={updateProfile}/></div>}
        {step===3&&<div className="mt-5"><LanguageChoices profile={profile} toggleLanguage={toggleLanguage}/></div>}
      </AnimateStep>
      <div className="mt-6 flex items-center justify-between gap-3"><button type="button" onClick={previous} disabled={step===0} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-40"><ArrowLeft size={15}/>Back</button><div className="flex gap-2">{steps.map((item,index)=><button type="button" key={item.kicker} aria-label={"Go to "+item.kicker} aria-current={index===step?"step":undefined} onClick={()=>setStep(index)} className={"h-2.5 w-2.5 rounded-full "+(index===step?"bg-brand":"bg-surface-2")}/>)}</div><button type="button" onClick={next} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-white">{step===3?"Start exploring":"Continue"}<ArrowRight size={15}/></button></div>
    </div>
    <p className="mt-4 text-center text-[10px] leading-relaxed text-muted">Your profile is saved on this device. Preferences guide ranking; they do not override local verification or dietary safety.</p>
  </div></main>;
}
function AnimateStep({step,children}) {
  return <div key={step} className="animate-[fade-in_180ms_ease-out]">{children}<span className="sr-only">Step {step+1}</span></div>;
}

export default function ProfileTab({ destination, destinations, selectDestination, requests, formatDate }) {
  const { profile, updateProfile, toggleInterest, toggleLanguage, restartOnboarding } = useProfile();
  return <section className="space-y-4">
    <div className="pitch-hero rounded-3xl p-5 text-white shadow-2xl sm:p-7" style={{"--destination-accent":destination.themeColors.accent}}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><IconBadge icon={Users} tone="violet"/><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Your traveler profile</p><h1 className="deck-heading mt-1 font-display text-4xl">Make it yours.</h1></div></div><ThemeToggle compact/></div><p className="mt-3 text-sm text-white/85">A few preferences make suggestions more relevant. You stay in control.</p></div>
    <section className={panel}><div className="flex items-center gap-2"><Globe2 size={18} className="text-accent-text"/><h2 className="font-serif text-2xl">Destination</h2></div><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">{destinations.map((item)=><button key={item.id} type="button" onClick={()=>selectDestination(item.id)} aria-pressed={destination.id===item.id} className={"min-h-20 rounded-xl border p-3 text-left "+(destination.id===item.id?"border-current bg-surface-2":"border-border bg-bg")}><span className="block text-[10px] text-muted">{item.country}</span><span className="mt-1 block font-serif text-xl">{item.city}</span></button>)}</div></section>
    <ProfileEditor profile={profile} updateProfile={updateProfile} toggleInterest={toggleInterest} toggleLanguage={toggleLanguage} currencyCode={destination.currency.code}/>
    <div className="flex justify-end"><button type="button" onClick={restartOnboarding} className="min-h-10 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold">Run profile setup again</button></div>
    <section className={panel}><h2 className="font-serif text-2xl">Saved trip notes</h2>{requests.length?<div className="mt-3 space-y-2">{requests.map((request)=><article key={request.id} className="rounded-xl border border-border bg-bg p-3"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-bold">{request.title}</h3><span className="rounded-full bg-surface-2 px-2 py-1 text-[10px] font-bold">{request.status}</span></div><p className="mt-1 text-xs text-muted">{request.category}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted">{request.detail}</p><time className="mt-2 block text-[10px] text-muted">{formatDate(request.createdAt,destination.locale,destination.timezone)}</time></article>)}</div>:<p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted">Save an image result, dish or experience to keep a note here.</p>}</section>
  </section>;
}
