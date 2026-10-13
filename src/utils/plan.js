const TIMES=["09:00 AM","10:45 AM","12:30 PM","02:30 PM","04:30 PM","07:00 PM"];
export function scorePlan(places, preferences={}, weather="sunny") {
 const interests=Array.isArray(preferences.interests)?preferences.interests:[];
 const style=String(preferences.travelStyle||"couple").toLowerCase();
 const pace=String(preferences.pace||"balanced").toLowerCase();
 const diet=String(preferences.dietaryPreference||"No preference").toLowerCase();
 const rainy=String(weather).toLowerCase().includes("rain");
 const ranked=(Array.isArray(places)?places:[]).slice(0,15).map(place=>{
  let score=(place.tags||[]).reduce((sum,tag)=>sum+(interests.includes(tag)?4:0),0);
  if((place.tags||[]).includes(style))score+=3;
  if((place.tags||[]).includes(pace))score+=2;
  if(rainy)score+=place.indoor?5:place.outdoor?-5:0; else if(place.outdoor)score+=2;
  if(place.category==="food"&&diet!=="no preference")score+=(place.dietary||[]).includes(diet)?3:-4;
  return {place,score};
 }).sort((a,b)=>b.score-a.score||a.place.name.localeCompare(b.place.name));
 const limit=pace==="relaxed"?4:pace==="packed"?6:5;
 const selected=[]; const counts={};
 for(const item of ranked){
  if(selected.length>=limit)break;
  const p=item.place; if(diet!=="no preference"&&p.category==="food"&&!(p.dietary||[]).includes(diet))continue;
  if((counts[p.category]||0)>=2)continue;
  selected.push(p); counts[p.category]=(counts[p.category]||0)+1;
 }
 return selected.map((place,index)=>({time:TIMES[index]||"Later today",title:place.name,desc:place.description,placeId:place.id,tags:[...new Set([...(place.tags||[]),place.category])].slice(0,5)}));
}
