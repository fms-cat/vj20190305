declare module '*.frag' {
  const source: string;
  export default source;
  export const addHotListener: ( listener: ( content: string ) => void ) => void;
}

declare module '*.vert' {
  const source: string;
  export default source;
  export const addHotListener: ( listener: ( content: string ) => void ) => void;
}
