export type ToothScreenPoint={x:number;y:number;anchorX:number;anchorY:number;left:number;right:number;top:number;bottom:number;rootTop:number;rootBottom:number};
// Labels are derived from projected anatomy, never from fixed percentages or tooth indices.
export function placeToothLabels(points:Record<string,ToothScreenPoint>,occlusal:boolean,width:number,height:number){
 const output=Object.fromEntries(Object.entries(points).map(([code,p])=>[code,{...p}]));
 for(const [code,p] of Object.entries(output)){
  const upper=Number(code[0])<3,side=code[0]==='1'||code[0]==='4'?-1:1,n=Number(code[1]);
  p.x=p.anchorX;p.y=upper?p.rootTop-23:p.rootBottom+23;
  if(occlusal){if(n<=2){p.y=upper?p.top-26:p.bottom+26;}else{p.x=side<0?p.left-27:p.right+27;p.y=p.anchorY;}}
  p.x=Math.max(18,Math.min(width-18,p.x));p.y=Math.max(18,Math.min(height-30,p.y));
 }
 const spread=(items:ToothScreenPoint[],axis:'x'|'y',limit:number,gap:number)=>{
  items.sort((a,b)=>a[axis]-b[axis]);for(let i=1;i<items.length;i++)items[i][axis]=Math.max(items[i][axis],items[i-1][axis]+gap);
  if(items.length&&items.at(-1)![axis]>limit){items.at(-1)![axis]=limit;for(let i=items.length-2;i>=0;i--)items[i][axis]=Math.min(items[i][axis],items[i+1][axis]-gap);}
 };
 if(!occlusal){for(const upper of [true,false])spread(Object.entries(output).filter(([c])=>(Number(c[0])<3)===upper).map(([,p])=>p),'x',width-18,29);}
 else{for(const q of ['1','2','3','4'])spread(Object.entries(output).filter(([c])=>c[0]===q&&Number(c[1])>=3).map(([,p])=>p),'y',height-36,27);
  for(const upper of [true,false])spread(Object.entries(output).filter(([c])=>(Number(c[0])<3)===upper&&Number(c[1])<=2).map(([,p])=>p),'x',width-18,30);
 }
 return output;
}
export function bridgeBand(a:ToothScreenPoint,b:ToothScreenPoint){
 const dx=b.anchorX-a.anchorX,dy=b.anchorY-a.anchorY,length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
 const radius=(p:ToothScreenPoint)=>Math.min(Math.abs(ux)>.01?(p.right-p.left)*.42/Math.abs(ux):Infinity,Math.abs(uy)>.01?(p.bottom-p.top)*.42/Math.abs(uy):Infinity,length*.4);
 const ra=radius(a),rb=radius(b);return {x1:a.anchorX+ux*ra,y1:a.anchorY+uy*ra,x2:b.anchorX-ux*rb,y2:b.anchorY-uy*rb};
}
