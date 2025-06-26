
// Enhanced browser polyfills for Solana Web3.js with better error handling
import { Buffer } from 'buffer';

console.log('🔧 Loading polyfills...');

// Make Buffer available globally
if (typeof window !== 'undefined') {
  console.log('🌐 Browser environment detected, setting up polyfills');
  window.Buffer = Buffer;
  window.global = window;
  
  // Add process polyfill
  if (!window.process) {
    window.process = {
      env: {},
      browser: true,
      version: '',
      platform: 'browser'
    } as any;
  }
  
  console.log('✅ Polyfills loaded successfully');
} else {
  console.log('🖥️ Node environment detected, skipping browser polyfills');
}

// Test polyfills immediately after loading
try {
  const testBuffer = Buffer.from('test');
  console.log('✅ Buffer polyfill working:', testBuffer.toString());
} catch (error) {
  console.error('❌ Buffer polyfill failed:', error);
}

// Export for explicit imports
export { Buffer };
