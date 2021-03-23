export { ResizeObserver } from '@juggle/resize-observer';

// From https://gist.github.com/joni/3760795/8f0c1a608b7f0c8b3978db68105c5b1d741d0446
function toUTF8Array(str) {
  var utf8 = [];
  for (var i=0; i < str.length; i++) {
    var charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 
        0x80 | (charcode & 0x3f));
    }
    else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 
        0x80 | ((charcode>>6) & 0x3f), 
        0x80 | (charcode & 0x3f));
    }
    // surrogate pair
    else {
      i++;
      charcode = ((charcode&0x3ff)<<10)|(str.charCodeAt(i)&0x3ff)
      utf8.push(0xf0 | (charcode >>18), 
        0x80 | ((charcode>>12) & 0x3f), 
        0x80 | ((charcode>>6) & 0x3f), 
        0x80 | (charcode & 0x3f));
    }
  }
  return utf8;
}


export class TextEncoder {
  constructor(encoding) {
    console.log('Using custom encoder, expect some real slow motion, please upgrade your browser');
    if(encoding && encoding.toLowerCase() !== 'utf-8' && encoding.toLowerCase() !== 'utf-16le')
      throw new Error(`Sorry, Meow's TextEncoder only supports UTF-8/16LE, required ${encoding}`);
    this.encoding = encoding.toLowerCase();
  }

  encode(str) {
    if(this.encoding === 'utf-16le') {
      const buf = new ArrayBuffer(str.length * 2);
      const view = new Uint16Array(buf);

      for(let i = 0; i < str.length; ++i)
        view[i] = str.charCodeAt(i);

      return buf;
    }

    const plain = toUTF8Array(str);
    const buf = new ArrayBuffer(plain.length);
    const arr = new Uint8Array(buf);
    for(let i = 0; i<plain.length; ++i) arr[i] = plain[i];
    return arr;
  }
}

export class TextDecoder {
  constructor(encoding) {
    console.log('Using custom decoder, expect some real slow motion');
    if(encoding && encoding.toLowerCase() !== 'utf-8' && encoding.toLowerCase() !== 'utf-16le')
      throw new Error(`Sorry, Meow's TextEncoder only supports UTF-8/16LE, required ${encoding}`);
    this.encoding = encoding.toLowerCase();
  }
  decode(arr) {
    if(!arr) return '';
    if(this.encoding === 'utf-16le')
      return String.fromCharCode(...new Uint16Array(arr));

    let result = '';
    for(let i = 0; i < arr.length; ++i) {
      const char = arr[i];

      const heading = char >> 4;

      if(heading < 8) // ASCII
        result += String.fromCharCode(char);
      else if(heading < 14) { // 2-byte
        ++i;
        const char2 = arr[i];

        result += String.fromCharCode(
          ((char & 0x1F) << 6) | (char2 & 0x3F)
        );
      } else {
        // 3-byte
        ++i;
        const char2 = arr[i];
        ++i;
        const char3 = arr[i];

        result += String.fromCharCode(
          ((char & 0x0F) << 12) |
          ((char2 & 0x3F) << 6) |
          ((char3 & 0x3F) << 0)
        );
      }
    }

    return result;
  }
}
