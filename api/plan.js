import { scorePlan } from "../src/utils/plan.js";
import { PLACES as CURATED_PLACES } from "../src/data/places.js";
const GEMINI_MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "") ? process.env.GEMINI_MODEL : "gemini-2.5-flash";
function send(res,status,payload){res.status(status).setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify(payload));}
function sanitise(places){return Array.isArray(places)?places.slice(0,15).filter(p=>p&&typeof p.id==="string"&&typeof p.name==="string").map(p=>({id:p.id,name:p.name,category:String(p.category||""),tags:Array.isArray(p.tags)?p.tags.filter(t=>typeof t==="string").slice(0,12):[],dietary:Array.isArray(p.dietary)?p.dietary.filter(t=>typeof t==="string"):[],description:String(p.description||""),location:String(p.location||""),indoor:Boolean(p.indoor),outdoor:Boolean(p.outdoor)})):[];}
function verify(items,places){const map=new Map(places.map(p=>[p.id,p])),seen=new Set();return (Array.isArray(items)?items:[]).filter(i=>i&&map.has(i.placeId)&&!seen.has(i.placeId)&&seen.add(i.placeId)).slice(0,6).map((i,index)=>{const p=map.get(i.placeId);return {time:String(i.time||["09:00 AM","10:45 AM","12:30 PM","02:30 PM","04:30 PM","07:00 PM"][index]),title:p.name,desc:p.description,placeId:p.id,tags:p.tags||[]};});}
export default async function handler(req,res){
 if(req.method!=="POST")return send(res,405,{error:"Use POST to build a day plan."});
 const requested=sanitise(req.body?.places);
 if(!requested.length)return send(res,400,{error:"A curated places list is required."});
 const requestedIds=new Set(requested.map(place=>place.id));
 // The server's source-data list is authoritative; clients cannot introduce new venues.
 const places=CURATED_PLACES.filter(place=>requestedIds.has(place.id)).slice(0,15);
 if(!places.length)return send(res,400,{error:"No supplied IDs matched the curated places list."});
 const preferences=req.body?.preferences&&typeof req.body.preferences==="object"?req.body.preferences:{},weather=String(req.body?.weather||"sunny"),fallback=()=>scorePlan(places,preferences,weather);
 const key=process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY;if(!key)return send(res,200,{itinerary:fallback(),source:"local-fallback"});
 const allowed=places.map(p=>p.id),prompt=["You are Atithi AI, a thoughtful hotel concierge planning a single day.","Return JSON with 4 to 6 itinerary items. Every placeId MUST exactly match an allowlisted id. Never invent, rename, or add places. Use the supplied place's exact name as title. On rainy weather, prefer indoor options. Personalise using interests, travel style, pace and diet. Avoid unsupported venue facts.", "Allowed IDs: "+allowed.join(", "),JSON.stringify({preferences,weather,places})].join("\n");
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),14500);
 try{
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="+encodeURIComponent(key),{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",responseSchema:{type:"OBJECT",properties:{itinerary:{type:"ARRAY",items:{type:"OBJECT",properties:{time:{type:"STRING"},title:{type:"STRING"},desc:{type:"STRING"},placeId:{type:"STRING",enum:allowed},tags:{type:"ARRAY",items:{type:"STRING"}}},required:["time","title","desc","placeId","tags"]}}},required:["itinerary"]}}})});
  if(!response.ok)throw new Error("Planning service unavailable");
  const data=await response.json(),txt=data?.candidates?.[0]?.content?.parts?.find(p=>p.text)?.text;if(!txt)throw new Error("Missing JSON response");
  const itinerary=verify(JSON.parse(txt).itinerary,places);if(itinerary.length<3)throw new Error("Too few verified places");
  return send(res,200,{itinerary,source:"gemini"});
 }catch{return send(res,200,{itinerary:fallback(),source:"local-fallback"});}finally{clearTimeout(timeout);}
}
