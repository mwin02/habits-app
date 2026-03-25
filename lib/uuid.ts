import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/** Generate a UUID v4 string. Safe to use in React Native. */
export function generateId(): string {
  return uuidv4();
}
