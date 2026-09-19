import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins:[react()],server:{port:4173},preview:{port:4173},
  define:{
    __BUILD_COMMIT__:JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA||process.env.VITE_GIT_COMMIT||'not supplied'),
    __BUILD_REF__:JSON.stringify(process.env.VERCEL_GIT_COMMIT_REF||'local'),
    __BUILD_CONTEXT__:JSON.stringify(process.env.VERCEL_ENV||process.env.VITE_BUILD_LABEL||'local')
  }
});
