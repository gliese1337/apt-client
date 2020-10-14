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

export default class GZheader {
  text      = 0; /* true if compressed data believed to be text */
  time      = 0; /* modification time */
  xflags    = 0; /* extra flags (not used when writing a gzip file) */
  os        = 0; /* operating system */
  extra: Uint8Array | null = null; /* pointer to extra field or Z_NULL if none */

  /* extra field length (valid if extra != Z_NULL) */
  extra_len = 0; // Actually, we don't need it in JS,
                 // but leave for few code modifications

  name      = ''; /* pointer to zero-terminated file name or Z_NULL */
  comment   = ''; /* pointer to zero-terminated comment or Z_NULL */

  hcrc      = 0;  /* true if there was or will be a header crc */
  done      = false; /* true when done reading gzip header (not used when writing a gzip file) */
};
