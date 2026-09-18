import {z} from 'zod';
export const ActionSchema=z.object({kind:z.enum(['click','fill','navigate','finish']),target:z.string().default(''),value:z.string().default(''),reason:z.string()});
export const ChoiceSchema=z.object({actionIndex:z.number().int().nonnegative(),confidence:z.number().min(0).max(1),reason:z.string()});
export const SafetySchema=z.object({safe:z.boolean(),score:z.number().min(0).max(1),confidence:z.number().min(0).max(1),reason:z.string()});
export type Action=z.infer<typeof ActionSchema>;

export const ActionJson={type:'object',additionalProperties:false,required:['kind','target','value','reason'],properties:{kind:{type:'string',enum:['click','fill','navigate','finish']},target:{type:'string'},value:{type:'string'},reason:{type:'string'}}};
export const ChoiceJson={type:'object',additionalProperties:false,required:['actionIndex','confidence','reason'],properties:{actionIndex:{type:'integer',minimum:0},confidence:{type:'number',minimum:0,maximum:1},reason:{type:'string'}}};
export const SafetyJson={type:'object',additionalProperties:false,required:['safe','score','confidence','reason'],properties:{safe:{type:'boolean'},score:{type:'number',minimum:0,maximum:1},confidence:{type:'number',minimum:0,maximum:1},reason:{type:'string'}}};
