declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';

  const source: ImageSourcePropType;
  export default source;
}

declare module '*.jpg' {
  const source: import('react-native').ImageSourcePropType;
  export default source;
}
