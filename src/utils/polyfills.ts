
// Browser polyfills for Solana Web3.js
import { Buffer } from 'buffer';

// Make Buffer available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  window.global = window;
}

// Export for explicit imports
export { Buffer };
