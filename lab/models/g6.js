/* 1-bit capacitor memory teaching model. SI units; no claim of a complete DRAM cell. */
(function(root){
'use strict';
const H=root.HNR=root.HNR||{};H.models=H.models||{};
const defaults={capF:1e-3,battV:3,leakOhm:100e3,readOhm:220,ledVf:1.9,writeTau:.01};
function params(p){return Object.assign({},defaults,p||{});}
function step(v,dt,mode,p){
  p=params(p);dt=Math.max(0,Number(dt)||0);v=Math.max(0,Math.min(p.battV,Number(v)||0));
  if(mode==='write')return p.battV+(v-p.battV)*Math.exp(-dt/p.writeTau);
  if(mode==='erase')return 0;
  if(mode==='read'&&v>p.ledVf){
    const a=(1/p.leakOhm+1/p.readOhm)/p.capF;
    const target=p.ledVf*p.leakOhm/(p.leakOhm+p.readOhm);
    return Math.max(0,target+(v-target)*Math.exp(-a*dt));
  }
  return v*Math.exp(-dt/(p.leakOhm*p.capF));
}
function current(v,p){p=params(p);return Math.max(0,(v-p.ledVf)/p.readOhm);}
function bit(v){return v>=2.3?1:0;}
H.models.g6={params,step,current,bit};
if(typeof module!=='undefined')module.exports=H.models.g6;
})(typeof window!=='undefined'?window:globalThis);
