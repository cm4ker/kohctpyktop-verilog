/** Connectivity-derived annotations for inspecting a transistor netlist. */
export interface PorChain { instance:string; depth:number; transistors:string[]; output:string; preOutput?:string; permutable:false }
export interface DelayLine extends PorChain { input:string }
export interface RsTrigger { instance:string; r:string; s:string; output:string; transistors:string[] }
