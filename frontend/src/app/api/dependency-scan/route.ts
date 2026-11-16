import { NextResponse } from "next/server";

type Dep = {name:string;version:string;ecosystem:"PyPI"|"npm"};
export async function POST(request:Request){
 try{
  const body=await request.text();if(body.length>30000)return NextResponse.json({error:"Request too large"},{status:413});
  const payload=JSON.parse(body) as {dependencies?:unknown};const deps=payload.dependencies;
  if(!Array.isArray(deps)||deps.length===0||deps.length>100||!deps.every((d:unknown)=>{if(!d||typeof d!=="object")return false;const x=d as Record<string,unknown>;return typeof x.name==="string"&&x.name.length<=200&&/^[\w@./-]+$/.test(x.name)&&typeof x.version==="string"&&x.version.length<=100&&/^[\w.!+-]+$/.test(x.version)&&(x.ecosystem==="PyPI"||x.ecosystem==="npm");}))return NextResponse.json({error:"Invalid dependency list"},{status:400});
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch("https://api.osv.dev/v1/querybatch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({queries:(deps as Dep[]).map(d=>({version:d.version,package:{name:d.name,ecosystem:d.ecosystem}}))}),signal:controller.signal,cache:"no-store"});
   if(!response.ok)return NextResponse.json({error:"OSV service returned an error. Please retry."},{status:502});
   const data=await response.json() as {results?:unknown};if(!Array.isArray(data.results)||data.results.length!==deps.length)return NextResponse.json({error:"Incomplete OSV response"},{status:502});
   return NextResponse.json({results:data.results},{headers:{"Cache-Control":"no-store"}});
  }finally{clearTimeout(timeout);}
 }catch{return NextResponse.json({error:"Dependency lookup failed. Check connectivity and retry."},{status:502});}
}
