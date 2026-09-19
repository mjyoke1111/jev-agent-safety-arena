/** Multi-backend offline calibration shootout.
 * Every backend sees the same frozen rows. Thresholds are fit independently per backend and condition.
 * Label-token softmax remains approximation evidence, not calibrated confidence.
 */
import fs from 'node:fs';
import {decide,type ConditionScores} from '../../lib/decision-backend.js';
type Row={id:string;goal:string;action:string;context:string;labels:{intent:boolean;reversibility:boolean;clarity:boolean}};
const path=process.argv[2];if(!path)throw new Error('usage: tsx harness/src/gate-calibration.ts fixtures.json');const rows=JSON.parse(fs.readFileSync(path,'utf8')) as Row[];if(rows.length<30)throw new Error('calibration requires at least 30 frozen labelled fixtures');
const backends=(process.env.GATE_SHOOTOUT_BACKENDS||'jev,nimble,kev,sglang-score').split(',').map(x=>x.trim()).filter(Boolean);const runs:any[]=[];
for(const backend of backends)for(const r of rows){const d=await decide({goal:r.goal,proposedAction:r.action,context:r.context,horizon:'this action only; no later actions are implied',choices:['allow_simulation','human_review','block_simulation']},backend);runs.push({id:r.id,labels:r.labels,scores:d.scores,model:d.model,backend:d.backend,route:d.route,method:d.method,latencyMs:d.latencyMs})}
function sweep(sub:any[],k:keyof ConditionScores){let best={threshold:1,balancedAccuracy:0,falseAllowRate:1};for(let t=.01;t<=.99;t+=.01){let tp=0,tn=0,fp=0,p=0,n=0;for(const r of sub){const y=Boolean(r.labels[k]);y?p++:n++;const pred=r.scores[k]>=t;if(y&&pred)tp++;if(!y&&!pred)tn++;if(!y&&pred)fp++}const b=(tp/Math.max(1,p)+tn/Math.max(1,n))/2,far=fp/Math.max(1,n);if(far<best.falseAllowRate||(far===best.falseAllowRate&&b>best.balancedAccuracy))best={threshold:Number(t.toFixed(2)),balancedAccuracy:b,falseAllowRate:far}}return best}
const results=backends.map(backend=>{const sub=runs.filter(r=>r.backend===backend);return{backend,model:sub[0]?.model,route:sub[0]?.route,method:sub[0]?.method,medianLatencyMs:sub.map(x=>x.latencyMs).sort((a,b)=>a-b)[Math.floor(sub.length/2)],fits:{intent:sweep(sub,'intent'),reversibility:sweep(sub,'reversibility'),clarity:sweep(sub,'clarity')}}});
const artifact={protocol:'gate-calibration-shootout-v2',createdAt:new Date().toISOString(),fixturePath:path,fixtureCount:rows.length,backends,warning:'Backends are compared on one frozen labelled set. Score-mode output is label-token softmax approximation evidence, not calibrated confidence. No standard System One benchmark claim.',results,rows:runs};process.stdout.write(JSON.stringify(artifact,null,2)+'\n');
