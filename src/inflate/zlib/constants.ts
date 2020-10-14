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
// 1. The origin of this software must not be misrepresented, you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

// This source file has been altered from its original version.
// It has been translated to TypeScript.

export default {

  /* Allowed flush values, see deflate() and inflate() below for details */
  Z_NO_FLUSH:         0,
  Z_PARTIAL_FLUSH:    1,
  Z_SYNC_FLUSH:       2,
  Z_FULL_FLUSH:       3,
  Z_FINISH:           4,
  Z_BLOCK:            5,
  Z_TREES:            6,

  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK:               0,
  Z_STREAM_END:       1,
  Z_NEED_DICT:        2,
  Z_ERRNO:           -1,
  Z_STREAM_ERROR:    -2,
  Z_DATA_ERROR:      -3,
  Z_MEM_ERROR:       -4,
  Z_BUF_ERROR:       -5,
  //Z_VERSION_ERROR: -6,

  /* compression levels */
  Z_NO_COMPRESSION:         0,
  Z_BEST_SPEED:             1,
  Z_BEST_COMPRESSION:       9,
  Z_DEFAULT_COMPRESSION:   -1,


  Z_FILTERED:               1,
  Z_HUFFMAN_ONLY:           2,
  Z_RLE:                    3,
  Z_FIXED:                  4,
  Z_DEFAULT_STRATEGY:       0,

  /* Possible values of the data_type field (though see inflate()) */
  Z_BINARY:                 0,
  Z_TEXT:                   1,
  //Z_ASCII:                1, //: Z_TEXT (deprecated)
  Z_UNKNOWN:                2,

  /* The deflate compression method */
  Z_DEFLATED:               8,
  //Z_NULL:                 null // Use -1 or null inline, depending on   type

  CODES:                    0,
  LENS:                     1,
  DISTS:                    2,

/* STATES ====================================================================*/
/* ===========================================================================*/

  HEAD:     1,   /* i: waiting for magic header */
  FLAGS:    2,   /* i: waiting for method and flags (gzip) */
  TIME:     3,   /* i: waiting for modification time (gzip) */
  OS:       4,   /* i: waiting for extra flags and operating system (gzip) */
  EXLEN:    5,   /* i: waiting for extra length (gzip) */
  EXTRA:    6,   /* i: waiting for extra bytes (gzip) */
  NAME:     7,   /* i: waiting for end of file name (gzip) */
  COMMENT:  8,   /* i: waiting for end of comment (gzip) */
  HCRC:     9,   /* i: waiting for header crc (gzip) */
  DICTID:   10,  /* i: waiting for dictionary check value */
  DICT:     11,  /* waiting for inflateSetDictionary() call */
  TYPE:     12,  /* i: waiting for type bits, including last-flag bit */
  TYPEDO:   13,  /* i: same, but skip check to exit inflate on new block */
  STORED:   14,  /* i: waiting for stored size (length and complement) */
  COPY_:    15,  /* i/o: same as COPY below, but only first time in */
  COPY:     16,  /* i/o: waiting for input or output to copy stored block */
  TABLE:    17,  /* i: waiting for dynamic block table lengths */
  LENLENS:  18,  /* i: waiting for code length code lengths */
  CODELENS: 19,  /* i: waiting for length/lit and distance code lengths */
  LEN_:     20,  /* i: same as LEN below, but only first time in */
  LEN:      21,  /* i: waiting for length/lit/eob code */
  LENEXT:   22,  /* i: waiting for length extra bits */
  DIST:     23,  /* i: waiting for distance code */
  DISTEXT:  24,  /* i: waiting for distance extra bits */
  MATCH:    25,  /* o: waiting for output space to copy string */
  LIT:      26,  /* o: waiting for output space to write literal */
  CHECK:    27,  /* i: waiting for 32-bit check value */
  LENGTH:   28,  /* i: waiting for 32-bit length (gzip) */
  DONE:     29,  /* finished check, done -- remain here until reset */
  BAD:      30,  /* got a data error -- remain here until reset */
  MEM:      31,  /* got an inflate() memory error -- remain here until reset */
  SYNC:     32,  /* looking for synchronization bytes to restart inflate() */

/* ===========================================================================*/

  ENOUGH_LENS:  852,
  ENOUGH_DISTS: 592,
};
