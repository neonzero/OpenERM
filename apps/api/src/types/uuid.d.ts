declare module 'uuid' {
  export function v4(): string;
  export namespace v4 {
    var RNG: () => void;
  }
  export function parse(uuid: string): Uint8Array;
  export function stringify(buf: Uint8Array, offset?: number): string;
  export function validate(uuid: string): boolean;
  export function version(uuid: string): number;
}