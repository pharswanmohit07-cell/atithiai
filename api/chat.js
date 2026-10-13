import { getDestinationById } from "../src/data/destinations/index.js";
import { detectTextLanguage, languageBase, targetLanguageTag } from "../src/i18n.js";

const GEMINI_MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "") ? process.env.GEMINI_MODEL : "gemini-2.5-flash";
const REPLY_COPY = {
  en:"I can help you explore this destination's places, local stories, experiences and dishes. Treat descriptions and spend estimates as demo ideas, and verify details locally.",
  hi:"मैं इस जगह के स्थानों, स्थानीय कहानियों, अनुभवों और व्यंजनों को खोजने में मदद कर सकता हूँ। विवरण और खर्च के अनुमान डेमो सुझाव हैं; स्थानीय रूप से पुष्टि करें।",
  es:"Puedo ayudarte a explorar lugares, historias locales, experiencias y platos de este destino. Las descripciones y los gastos son ideas de demostración; verifica los detalles localmente.",
  fr:"Je peux vous aider à découvrir les lieux, histoires locales, expériences et plats de cette destination. Les descriptions et dépenses sont des idées de démonstration ; vérifiez les détails sur place.",
  de:"Ich helfe dir, Orte, lokale Geschichten, Erlebnisse und Gerichte dieses Reiseziels zu entdecken. Beschreibungen und Ausgaben sind Demo-Ideen; prüfe Details vor Ort.",
  ja:"この目的地の場所、地域の物語、体験、料理を紹介できます。説明や費用はデモ用の案です。詳細は現地で確認してください。",
  ar:"يمكنني مساعدتك في اكتشاف الأماكن والقصص المحلية والتجارب والأطباق في هذه الوجهة. الأوصاف والتكاليف أفكار تجريبية؛ تحقق من التفاصيل محليًا.",
  zh:"我可以帮助你探索此目的地的地点、当地故事、体验和菜肴。描述和花费仅为演示建议，请在当地确认详情。"
};

function send(res,status,payload){
  res.status(status).setHeader("Content-Type","application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
function cleanText(value,max=300){
  return typeof value==="string"?value.trim().replace(/\u0000/g,"").slice(0,max):"";
}
function validLanguage(value){
  const candidate=cleanText(value,45).replace(/_/g,"-");
  if(!candidate||candidate.toLowerCase()==="auto")return "auto";
  try{return Intl.getCanonicalLocales(candidate)[0]||"auto";}catch{return "auto";}
}
function fallbackReply(language){
  return REPLY_COPY[languageBase(language)]||REPLY_COPY.en;
}

export default async function handler(req,res){
  if(req.method!=="POST")return send(res,405,{error:"Use POST to send a message."});
  const body=req.body&&typeof req.body==="object"?req.body:{};
  const message=cleanText(body.message,1200);
  if(!message)return send(res,400,{error:"Please enter a message."});

  const destination=getDestinationById(cleanText(body.destinationId,50));
  const replyLanguage=validLanguage(body.replyLanguage);
  const detected=detectTextLanguage(message);
  const targetLanguage=replyLanguage==="auto"?"":replyLanguage;
  const fallbackLanguage=targetLanguage||detected;
  const fallback=fallbackReply(fallbackLanguage);
  const apiKey=process.env.GEMINI_API_KEY;
  if(!apiKey)return send(res,200,{reply:fallback,source:"local-fallback"});

  const placeContext=destination.places.map(({id,name,category,localStory,tags,bestTime,crowdLevel,isHiddenGem})=>({id,name,category,localStory,tags,bestTime,crowdLevel,isHiddenGem}));
  const experienceContext=destination.experiences.map(({id,title,hostName,category,durationMin,priceLocal,communityLed,suitsWho,rainFriendly,localStory})=>({id,title,hostName,category,durationMin,priceLocal,communityLed,suitsWho,rainFriendly,localStory,demo:true}));
  const dishContext=destination.dishes.map(({id,name,description,diet,spiceLevel,whereToEat,priceRangeLocal,bestTime,warm})=>({id,name,description,diet,spiceLevel,whereToEat,priceRangeLocal,bestTime,warm,demo:true}));

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),9000);
  try{
    const prompt=[
      "You are Atithi AI, a personalized travel companion that helps travelers notice hidden places, local stories and experiences beyond the usual.",
      targetLanguage
        ? "Reply in this exact requested language: "+targetLanguage+"."
        : "Detect the language the traveler wrote in and reply in that language. Do not default to English if the message is clearly in another language.",
      "Use the supplied city, country, currency and primary languages as destination context. When recommending a specific place, experience or dish, use only the entries provided in the corresponding lists. Never invent a place, local story, partner, dish, price, opening hour, travel time, current availability or booking.",
      "All place stories, crowd levels, hosts, durations and spend ranges are demo/AI-assisted estimates. Mark spend amounts and host names as illustrative when mentioned. If the lists do not support an answer, say what is unknown and suggest checking locally.",
      "Do not claim access to live opening hours, crowds, transit, tickets, reservations or safety conditions. Weather is the only live destination feed. Do not claim that you have contacted anyone, booked anything, or checked anything externally.",
      "Give a warm, concise, practical answer. Prefer 2 to 5 sentences. Treat dietary flags as uncertain if null and never make an allergen-free guarantee.",
      JSON.stringify({
        travelerMessage:message,
        requestedLanguage:targetLanguage||"detect from traveler message",
        detectedLanguageHint:detected,
        travelerPreferences:{
          interests:Array.isArray(body.preferences?.interests)?body.preferences.interests.filter((item)=>typeof item==="string").slice(0,10).map((item)=>cleanText(item,40)) : [],
          pace:cleanText(body.preferences?.pace,30)||"balanced",
          dietaryPreference:cleanText(body.preferences?.dietaryPreference,40)||"any"
        },
        destination:{
          city:destination.city,country:destination.country,locale:destination.locale,
          currency:destination.currency.code,primaryLanguages:destination.primaryLanguages,
          places:placeContext,experiences:experienceContext,dishes:dishContext
        }
      })
    ].join("\n");

    const response=await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/"+GEMINI_MODEL+":generateContent?key="+encodeURIComponent(apiKey),
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        signal:controller.signal,
        body:JSON.stringify({
          contents:[{role:"user",parts:[{text:prompt}]}],
          generationConfig:{temperature:0.35,maxOutputTokens:450}
        })
      }
    );
    if(!response.ok)throw new Error("Message service unavailable");
    const payload=await response.json();
    const modelText=payload?.candidates?.[0]?.content?.parts?.find((part)=>part.text)?.text;
    const reply=cleanText(modelText,2200);
    if(!reply)throw new Error("Empty response");
    return send(res,200,{reply,source:"gemini",language:targetLanguage||detected});
  }catch{
    return send(res,200,{reply:fallback,source:"local-fallback",language:fallbackLanguage});
  }finally{
    clearTimeout(timeout);
  }
}
