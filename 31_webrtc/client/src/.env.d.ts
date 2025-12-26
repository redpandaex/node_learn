declare namespace NodeJS {
  interface ProcessEnv {
    readonly WS_HOST: string;
    readonly HTTP_HOST: string;
  }
}
