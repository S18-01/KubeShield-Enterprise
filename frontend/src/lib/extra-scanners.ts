import type { Finding, ScanResult } from "./kubernetes-scanner";
export type ScannerType = "kubernetes" | "dockerfile" | "terraform" | "iam" | "dependencies";
export const scannerLabels: Record<ScannerType,string> = {kubernetes:"Kubernetes YAML",dockerfile:"Dockerfile",terraform:"Terraform HCL",iam:"AWS IAM Policy",dependencies:"Dependencies (OSV)"};
export const scannerNames: Record<ScannerType,string> = {kubernetes:"Kubernetes Security Scan",dockerfile:"Dockerfile Security Scan",terraform:"Terraform Security Scan",iam:"AWS IAM Security Scan",dependencies:"Dependency Vulnerability Scan"};
export const scannerAccept: Record<ScannerType,string> = {kubernetes:".yaml,.yml",dockerfile:".dockerfile,.txt",terraform:".tf",iam:".json",dependencies:".txt,.json"};
export const scannerExamples: Record<ScannerType,string> = {
  kubernetes:"", dockerfile:"FROM ubuntu:latest\nRUN curl https://example.com/install.sh | sh\nUSER root",
  terraform:`resource "aws_security_group" "web" {
  ingress {
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_s3_bucket_public_access_block" "demo" {
  block_public_acls = false
  block_public_policy = false
}`, 
  iam:JSON.stringify({Version:"2012-10-17",Statement:[{Effect:"Allow",Action:"*",Resource:"*"}]},null,2),
  dependencies:"requests==2.19.0\nflask==0.12.2"
};
function validate(input:string){if(input.length>200000)throw new Error("Maximum input size is 200 KB.");if(!input.trim())throw new Error("Input is empty.");}
function finish(resources:number,findings:Finding[]):ScanResult {const weights={Critical:25,High:15,Medium:7,Low:3};return {resources,findings,score:Math.max(0,100-findings.reduce((sum,f)=>sum+weights[f.severity],0))};}
export function scanTerraform(input:string):ScanResult {
 validate(input); const findings:Finding[]=[];
 const add=(severity:Finding["severity"],resource:string,message:string,recommendation:string)=>findings.push({id:`tf-${findings.length+1}`,severity,resource,message,recommendation});
 // Lightweight HCL heuristics: not a full parser, does not resolve variables/modules.
 const lines=input.split(/\r?\n/);let resources=0;
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(line.startsWith("#")||line.startsWith("//"))continue;
  if(/^resource\s+"/.test(line))resources++;
  if(/cidr_blocks\s*=\s*\[[^\]]*"0\.0\.0\.0\/0"/.test(line))add("High",`Line ${i+1}`,"Security group may allow public IPv4 ingress.","Restrict CIDR blocks and validate the associated ingress ports.");
  if(/ipv6_cidr_blocks\s*=\s*\[[^\]]*"::\/0"/.test(line))add("High",`Line ${i+1}`,"Security group may allow public IPv6 ingress.","Restrict IPv6 ingress to approved ranges.");
  if(/(?:publicly_accessible|associate_public_ip_address)\s*=\s*true\b/.test(line))add("High",`Line ${i+1}`,"Public network exposure enabled.","Disable public access unless explicitly required.");
  if(/(?:encrypted|storage_encrypted|block_public_acls|block_public_policy|restrict_public_buckets|ignore_public_acls)\s*=\s*false\b/.test(line))add("High",`Line ${i+1}`,"Encryption or public-access protection disabled.","Enable encryption and public-access protections as appropriate.");
  if(/(?:acl)\s*=\s*"public-read(?:-write)?"/.test(line))add("Critical",`Line ${i+1}`,"Public bucket ACL detected.","Remove public ACLs and enable S3 public access block.");
 }
 if(!resources)throw new Error("No Terraform resource blocks found. This scanner supports basic resource configuration checks.");
 return finish(resources,findings);
}
export function scanIam(input:string):ScanResult {
 validate(input);let doc:unknown;try{doc=JSON.parse(input);}catch{throw new Error("Invalid IAM JSON.");}
 if(!doc||typeof doc!=="object"||Array.isArray(doc))throw new Error("Expected an IAM policy object.");
 const obj=doc as Record<string,unknown>;const statements=Array.isArray(obj.Statement)?obj.Statement:[obj.Statement].filter(Boolean);
 if(!statements.length)throw new Error("No IAM Statement found.");const findings:Finding[]=[];
 const add=(severity:Finding["severity"],resource:string,message:string,recommendation:string)=>findings.push({id:`iam-${findings.length+1}`,severity,resource,message,recommendation});
 statements.forEach((s,index)=>{if(!s||typeof s!=="object")return;const st=s as Record<string,unknown>;if(st.Effect!=="Allow")return;const actions=Array.isArray(st.Action)?st.Action:[st.Action];const resources=Array.isArray(st.Resource)?st.Resource:[st.Resource];const a=actions.filter((x):x is string=>typeof x==="string");const r=resources.filter((x):x is string=>typeof x==="string");const loc=`Statement ${index+1}`;
  if(a.includes("*")&&r.includes("*"))add("Critical",loc,"Administrator-style wildcard access to all resources.","Replace Action and Resource wildcards with least-privilege permissions.");
  else {if(a.some(x=>x==="*"||x.endsWith(":*")))add("High",loc,"Wildcard IAM actions allowed.","Restrict actions to required API operations.");if(r.includes("*"))add("Medium",loc,"IAM permissions apply to all resources.","Scope permissions to specific ARNs where supported.");}
  if(st.NotAction!==undefined||st.NotResource!==undefined)add("Medium",loc,"NotAction or NotResource requires manual review.","Review effective access, conditions, and permission boundaries.");
  if(st.Principal==="*"||(typeof st.Principal==="object"&&st.Principal!==null&&JSON.stringify(st.Principal).includes('"*"')))add("High",loc,"Wildcard principal detected.","Limit trusted principals and use conditions where appropriate.");
 });return finish(statements.length,findings);
}
export type Dependency = {name:string;version:string;ecosystem:"PyPI"|"npm"};
export function parseDependencies(input:string):Dependency[]{
 validate(input);let deps:Dependency[]=[];
 if(input.trimStart().startsWith("{")){
  let data:unknown;try{data=JSON.parse(input);}catch{throw new Error("Invalid package.json.");}
  if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Expected package.json.");
  const pkg=data as Record<string,unknown>;
  for(const field of ["dependencies","devDependencies"]){const group=pkg[field];if(!group||typeof group!=="object"||Array.isArray(group))continue;for(const [name,value] of Object.entries(group)){if(typeof value!=="string")continue;const version=value.trim();if(/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version))deps.push({name,version,ecosystem:"npm"});}}
 }else{for(const line of input.split(/\r?\n/)){const trimmed=line.trim();if(!trimmed||trimmed.startsWith("#")||trimmed.startsWith("-"))continue;const m=trimmed.match(/^([A-Za-z0-9_.-]+)==([A-Za-z0-9_.!+-]+)(?:\s*(?:#.*)?)?$/);if(m)deps.push({name:m[1],version:m[2],ecosystem:"PyPI"});}}
 if(!deps.length)throw new Error("No exact pinned dependencies found. Use requirements.txt with == versions or package.json with exact versions (no ^ or ~).");
 if(deps.length>100)throw new Error("Maximum 100 dependencies per scan.");return deps;
}
export async function scanDependencies(input:string):Promise<ScanResult>{
 const dependencies=parseDependencies(input);
 const response=await fetch("/api/dependency-scan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dependencies})});
 if(!response.ok){let reason="OSV scan unavailable";try{const error=await response.json();if(typeof error.error==="string")reason=error.error;}catch{}throw new Error(reason);}
 const data:unknown=await response.json();if(!data||typeof data!=="object"||!("results" in data))throw new Error("Unexpected vulnerability service response.");
 const rows=(data as {results:unknown}).results;if(!Array.isArray(rows)||rows.length!==dependencies.length)throw new Error("Incomplete OSV results. No score was generated.");
 const findings:Finding[]=[];rows.forEach((row,index)=>{const vulns=(row as {vulns?:{id?:string}[]})?.vulns??[];for(const vuln of vulns){if(typeof vuln.id!=="string")continue;findings.push({id:`osv-${index}-${vuln.id}`,severity:"High",resource:`${dependencies[index].name}@${dependencies[index].version}`,message:`Known vulnerability reported by OSV: ${vuln.id}. Severity not assessed by this scanner.`,recommendation:`Review https://osv.dev/vulnerability/${encodeURIComponent(vuln.id)} and upgrade to a patched version.`});}});
 // High is a provisional chart category, not an authoritative severity rating.
 return finish(dependencies.length,findings);
}
