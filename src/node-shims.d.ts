declare const process: any;

declare module 'node:fs' {
  export const accessSync: any;
  export const chmodSync: any;
  export const constants: any;
  export const existsSync: any;
  export const mkdirSync: any;
  export const readFileSync: any;
  export const renameSync: any;
  export const unlinkSync: any;
  export const writeFileSync: any;
}

declare module 'node:path' {
  export const dirname: any;
  export const isAbsolute: any;
  export const join: any;
  export const resolve: any;
}

declare module 'node:url' {
  export const fileURLToPath: any;
}

declare module 'node:child_process' {
  export const spawnSync: any;
}

declare module 'node:readline/promises' {
  export const createInterface: any;
}

declare module 'node:process' {
  export const stdin: any;
  export const stdout: any;
}
