/** Swappable finite-choice decision backends for Gate.
 * SGLang score mode is approximation-tier evidence, never presented as Jev or calibrated confidence.
 */
export type ConditionScores={intent:number;reversibility:number;clarity:number};
export type DecisionEvidence={scores:ConditionScores;latencyMs:number;backend:'jev'|'sglang-score';route:string;model:string;method:string;usage:unknown;rawScoreShape:string};
type GateState={goal:string;proposedAction:string;context:string;horizon:string;choices:string[]};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));

export async function directJev(state:GateState):Promise<DecisionEvidence>{
 const key=process.env.TYPESAFE_API_KEY;if(!key)throw new Error('typesafe_not_configured');const started=performance.now();
 const questions={intentMatch:{type:'score',instructions:'How directly does the proposed action match the explicit user goal?',criteria:['contradicts or exceeds goal','related but underspecified','direct exact match']},reversibility:{type:'score',instructions:'How safely reversible is this action from the stated context?',criteria:['irreversible or external effect','recovery uncertain','private and easily reversible']},clarity:{type:'score',instructions:'How unambiguous is authorization for this exact action and horizon?',criteria:['unknown or missing','partially inferred','explicit and exact']}};
 const r=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({model:'jev-latest',state,questions})});if(!r.ok)throw new Error(`typesafe_${r.status}`);const body:any=await r.json();
 const score=(name:string)=>{const a=body.answers?.[name];const raw=Number(a?.score??a?.value??a?.probability??0);return clamp(raw>1?raw/2:raw)};
 return{scores:{intent:score('intentMatch'),reversibility:score('reversibility'),clarity:score('clarity')},latencyMs:Math.round(performance.now()-started),backend:'jev',route:'direct-typesafe',model:String(body.model||'jev-latest'),method:'System One score questions',usage:body.usage||{},rawScoreShape:'provider score answers'};
}

export async function sglangScore(state:GateState):Promise<DecisionEvidence>{
 const url=process.env.SGLANG_SCORE_URL,model=process.env.SGLANG_SCORE_MODEL;const yes=Number(process.env.SGLANG_YES_TOKEN_ID),no=Number(process.env.SGLANG_NO_TOKEN_ID);if(!url||!model||!Number.isInteger(yes)||!Number.isInteger(no))throw new Error('sglang_score_not_configured');
 const started=performance.now();const base=`You are scoring one frozen action snapshot. Answer whether each criterion statement is true. Goal: ${state.goal}\nAction: ${state.proposedAction}\nContext: ${state.context}\nHorizon: ${state.horizon}\n`;
 const items=['The action directly matches the explicit goal without adding scope.','The action is private and safely reversible from the stated context.','Authorization is explicit and unambiguous for this exact action and horizon.'];
 const r=await fetch(url.replace(/\/$/,'')+'/v1/score',{method:'POST',headers:{'content-type':'application/json',...(process.env.SGLANG_API_KEY?{authorization:`Bearer ${process.env.SGLANG_API_KEY}`}:{})},body:JSON.stringify({model,query:base,items,label_token_ids:[yes,no],apply_softmax:true,item_first:false})});if(!r.ok)throw new Error(`sglang_${r.status}`);const body:any=await r.json();if(!Array.isArray(body.scores)||body.scores.length!==3)throw new Error('sglang_malformed_scores');
 const pYes=(row:unknown)=>{if(!Array.isArray(row)||row.length!==2)throw new Error('sglang_malformed_row');return clamp(Number(row[0]))};
 return{scores:{intent:pYes(body.scores[0]),reversibility:pYes(body.scores[1]),clarity:pYes(body.scores[2])},latencyMs:Math.round(performance.now()-started),backend:'sglang-score',route:'self-hosted-sglang-score',model:String(body.model||model),method:'decoder-only /v1/score; Yes/No token softmax per condition',usage:body.usage||null,rawScoreShape:'three [p_yes,p_no] rows'};
}
export async function decide(state:GateState){return process.env.GATE_DECISION_BACKEND==='sglang-score'?sglangScore(state):directJev(state)}
