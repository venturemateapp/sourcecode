/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_VM_RUNTIME_URL?: string;
  readonly VITE_VM_PROJECT_ID?: string;
  readonly VITE_VM_RUNTIME_KEY?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
