/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUI_NETWORK: string;
  readonly VITE_CONTRACT_PACKAGE_ID: string;
  readonly VITE_CONTRACT_GAME_CONFIG_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

