export const Utility={Create2DArray:(w,h,v)=>Array.from({length:w},()=>Array(h).fill(v))};
export const images=new Map();
export const Raster={Blit(ctx,name,x=0,y=0,rotation=0) {
  const img=images.get(name);if(!img)return;
  if(!rotation){ctx.drawImage(img,x,y);return;}
  ctx.save();ctx.translate(Math.trunc(img.height/2)+x,Math.trunc(img.width/2)+y);
  ctx.rotate(rotation*Math.PI/180);ctx.drawImage(img,-Math.trunc(img.width/2),-Math.trunc(img.height/2));ctx.restore();
}};
