export function extractResponseText(data: unknown): string {
 if (!data || typeof data !== "object") return "";
 const value = data as {output_text?: unknown; output?: unknown};
 if (typeof value.output_text === "string" && value.output_text.trim()) return value.output_text.trim();
 if (!Array.isArray(value.output)) return "";
 return value.output.flatMap(item => item?.type === "message" && Array.isArray(item.content) ? item.content.flatMap((part: {type?: string; text?: unknown; refusal?: unknown}) => part.type === "output_text" && typeof part.text === "string" ? [part.text] : part.type === "refusal" && typeof part.refusal === "string" ? [part.refusal] : []) : []).join("\n").trim();
}
export function normalizeHistory(history: unknown): {role:"user"|"assistant";content:string}[] {
 if (!Array.isArray(history)) return [];
 return history.filter(item => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string").slice(-12).map(item => ({role:item.role,content:item.content.slice(0,2000)}));
}
export async function readBoundedBody(request: Request, maxBytes: number) {
 const reader=request.body?.getReader(); if (!reader) throw new Error("EMPTY_BODY");
 const decoder=new TextDecoder(); let size=0, text="";
 try { while (true) { const {done,value}=await reader.read(); if (done) break; size+=value.byteLength; if(size>maxBytes) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); } text+=decoder.decode(value,{stream:true}); } return text+decoder.decode(); } finally { reader.releaseLock(); }
}
