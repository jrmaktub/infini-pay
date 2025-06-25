
export function runPolyfillTest() {
  console.log('=== Polyfill Test Results ===');
  console.log('Buffer is', typeof Buffer !== 'undefined' ? 'available' : 'NOT available');
  console.log('process is', typeof process !== 'undefined' ? 'available' : 'NOT available');
  
  if (typeof Buffer !== 'undefined') {
    try {
      const buf = Buffer.from('test');
      console.log('Buffer.from works:', buf.toString());
    } catch (e) {
      console.error('Buffer.from failed:', e);
    }
  }
  
  if (typeof process !== 'undefined') {
    console.log('process.env is', typeof process.env !== 'undefined' ? 'available' : 'NOT available');
    console.log('process.browser is', process.browser);
  }
  
  console.log('=== End Polyfill Test ===');
}
