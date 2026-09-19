/** Offline calibration harness contract.
 * Run only after supplying a labelled JSON set and a configured backend.
 * Fits each condition independently; never treats score-mode softmax as calibrated confidence.
 */
import fs from 'node:fs';
import {decide,type ConditionScores} from '../../lib/decision-backend.js';
type Row={id:string;goal:string;action:string;context:string;labels:{intent:boolean;reversibility:boolean;clarity:boolean}};
const path=process.argv[2];if(!path)throw new Error('usage: tsx harness/src/gate-calibration.ts fixtures.json');const rows=JSON.parse(fs.readFileSync(path,'utf8')) as Row[];if(rows.length<30)throw new Error('calibration requires at least 30 frozen labelled fixtures');
const out=[] as any[];for(const r of rows){const d=await decide({goal:r.goal,proposedAction:r.action,context:r.context,horizon:'this action only; no later actions are implied',choices:['allow_simulation','human_review','block_simulation']});out.push({id:r.id,labels:r.labels,scores:d.scores,model:d.model,backend:d.backend,route:d.route,method:d.method,latencyMs:d.latencyMs})}
function sweep(k:keyof ConditionScores){let best={threshold:1,balancedAccuracy:0};for(let t=.01;t<=.99;t+=.01){let tp=0,tn=0,p=0,n=0;for(const r of out){const y=Boolean(r.labels[k]);y?p++:n++;const pred=r.scores[k]>=t;if(y&&pred)tp++;if(!y&&!pred)tn++}const b=(tp/Math.max(1,p)+tn/Math.max(1,n))/2;if(b>best.balancedAccuracy)best={threshold:Number(t.toFixed(2)),balancedAccuracy:b}}return best}
const artifact={protocol:'gate-calibration-v1',createdAt:new Date().toISOString(),fixturePath:path,fixtureCount:rows.length,backend:out[0]?.backend,model:out[0]?.model,method:out[0]?.method,warning:'Score-mode output is softmax-over-label-tokens approximation evidence, not calibrated confidence.',fits:{intent:sweep('intent'),reversibility:sweep('reversibility'),clarity:sweep('clarity')},rows:out};
process.stdout.write(JSON.stringify(artifact,null,2)+'\n');
