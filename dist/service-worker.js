if(!self.define){let e,i={};const s=(s,r)=>(s=new URL(s+".js",r).href,i[s]||new Promise((i=>{if("document"in self){const e=document.createElement("script");e.src=s,e.onload=i,document.head.appendChild(e)}else e=s,importScripts(s),i()})).then((()=>{let e=i[s];if(!e)throw new Error(`Module ${s} didn’t register its module`);return e})));self.define=(r,n)=>{const a=e||("document"in self?document.currentScript.src:"")||location.href;if(i[a])return;let o={};const c=e=>s(e,a),l={module:{uri:a},exports:o,require:c};i[a]=Promise.all(r.map((e=>l[e]||c(e)))).then((e=>(n(...e),o)))}}define(["./workbox-79ffe3e0"],(function(e){"use strict";e.setCacheNameDetails({prefix:"canvas-editor"}),self.addEventListener("message",(e=>{e.data&&"SKIP_WAITING"===e.data.type&&self.skipWaiting()})),e.precacheAndRoute([{url:"css/app.725b4348.css",revision:null},{url:"img/logo.png",revision:"82b9c7a5a3f405032b1db71a25f67021"},{url:"img/shape-1.jpg",revision:"e77faaac3c6664ac8580d1d5ee49e7ae"},{url:"img/shape-2.jpg",revision:"0318ae7fc70adcea009d37f9730db006"},{url:"img/shape-3.jpg",revision:"b58264daaeb1f69abaa16c3e622c00fa"},{url:"img/shape-4.jpg",revision:"0489166f2d83a7d09db9e4c880bcf56a"},{url:"index.html",revision:"75fadfa76eabbb0bfa9867b2520f1a02"},{url:"js/app.d4660203.js",revision:null},{url:"js/chunk-vendors.91dba8ad.js",revision:null},{url:"manifest.json",revision:"b6bcf5c4069b2799077023b1b99b0488"},{url:"robots.txt",revision:"b6216d61c03e6ce0c9aea6ca7808f7ca"}],{})}));
//# sourceMappingURL=service-worker.js.map
