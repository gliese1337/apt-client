// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

// This source file has been altered from its original version.
// It has been translated to TypeScript.

import GZstate from "./gzstate";

export default class ZStream {
  /* next input byte */
  input: Uint8Array | null = null; // JS specific, because we have no pointers
  next_in = 0;
  avail_in = 0; /* number of bytes available at input */
  total_in = 0; /* total number of input bytes read so far */
  output: Uint8Array | null = null; // JS specific, because we have no pointers
  next_out = 0; /* next output byte should be put there */
  avail_out = 0; /* remaining free space at output */
  total_out = 0; /* total number of bytes output so far */
  msg = ''/*Z_NULL*/; /* last error message, NULL if no error */
  data_type = 2/*Z_UNKNOWN*/;   /* best guess about the data type: binary or text */
  adler = 0;     /* adler32 value of the uncompressed data */
  state: GZstate;

  constructor(windowBits: number) {
    const state = this.state = new GZstate();

    /* extract wrap request from windowBits parameter */
    let wrap: number;
    if (windowBits < 0) {
      wrap = 0;
      windowBits = -windowBits;
    } else {
      wrap = (windowBits >> 4) + 1;
      if (windowBits < 48) {
        windowBits &= 15;
      }
    }

    /* set number of window bits, free window if different */
    if (windowBits && (windowBits < 8 || windowBits > 15)) throw new Error("stream error");

    /* update state and reset the rest of it */
    state.wrap = wrap;
    state.wbits = windowBits;

    if (wrap) {       /* to support ill-conceived Java test suite */
      this.adler = wrap & 1;
    }
  }
}
