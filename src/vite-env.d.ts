/// <reference types="vite/client" />
interface ImportMetaEnv { readonly VITE_BUILD_LABEL?: string; readonly VITE_GIT_COMMIT?: string }
interface ImportMeta { readonly env: ImportMetaEnv }
