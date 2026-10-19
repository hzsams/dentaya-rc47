export type UiMessageSpec={source:string;values:unknown[];userValues?:number[]};
export function formatUiMessage({source,values,userValues=[]}:UiMessageSpec,t:(source:string)=>string,protectedContent=false){
 return (protectedContent?source:t(source)).replace(/\{(\d+)\}/g,(_m,index)=>{
  const value=String(values[Number(index)]);
  return protectedContent||userValues.includes(Number(index))?value:t(value);
 });
}
