/// <reference types="vite/client" />
export const librarySources=import.meta.glob('../library/**/*.v',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
