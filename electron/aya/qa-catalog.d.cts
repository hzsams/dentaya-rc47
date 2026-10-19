export type QaEntry={id:string;topicId:string;category:string;question:string;answer:string;facet:string;sourceIds:string[]};
export type QaTopic={id:string;title:string;aliases:string[];category:string;answers:string[];sourceIds:string[]};
export const entries:QaEntry[];
export const topics:QaTopic[];
export const facets:string[];
export const CATALOG_VERSION:string;
export const stats:{version:string;questions:number;topics:number;language:string;categories:{id:string;title:string;questions:number}[]};
export const sources:Record<string,{name:string;url:string|null;kind:string}>;
