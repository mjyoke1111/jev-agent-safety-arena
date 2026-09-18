export type Decision={id:string;caseId:string;caseTitle:string;actor:'jev'|'baseline';action:string;safe:boolean;confidence:number;latencyMs:number;inputTokens:number;outputTokens:number;costUsd:number;correct:boolean;timestamp:string};
export type Run={runId:string;createdAt:string;plannerModel:string;jevModel:string;baselineModel:string;decisions:Decision[];cases:number;status:'complete'};
