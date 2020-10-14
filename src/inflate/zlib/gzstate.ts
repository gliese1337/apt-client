import c from './constants';
import GZheader from "./gzheader";

export default class GZstate {
  mode = c.HEAD;         /* current inflate mode */
  last = 0;              /* true if processing last block */
  wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
  havedict = 0;          /* true if dictionary provided */
  flags = 0;             /* gzip header method and flags (0 if zlib) */
  dmax = 32768;          /* zlib header max distance (INFLATE_STRICT) */
  check = 0;             /* protected copy of check value */
  total = 0;             /* protected copy of output count */
  head: GZheader | null = null; /* where to save gzip header information */

  /* sliding window */
  wbits = 0;             /* log base 2 of requested window size */
  wsize = 0;             /* window size or zero if not using window */
  whave = 0;             /* valid bytes in the window */
  wnext = 0;             /* window write index */
  window: Uint8Array | null = null; /* allocated sliding window, if needed */

  /* bit accumulator */
  hold = 0;              /* input bit accumulator */
  bits = 0;              /* number of bits in "in" */

  /* for string and stored block copying */
  length = 0;            /* literal or length of data to copy */
  offset = 0;            /* distance back to copy string from */

  /* for table and code decoding */
  extra = 0;             /* extra bits needed */

  /* fixed and dynamic code tables */
  lencode: Uint32Array;  /* starting table for length/literal codes */
  distcode: Uint32Array; /* starting table for distance codes */
  lenbits = 0;           /* index bits for lencode */
  distbits = 0;          /* index bits for distcode */

  /* dynamic table building */
  ncode = 0;             /* number of code length code lengths */
  nlen = 0;              /* number of length code lengths */
  ndist = 0;             /* number of distance code lengths */
  have = 0;              /* number of code lengths in lens[] */

  lens = new Uint16Array(320); /* temporary storage for code lengths */
  work = new Uint16Array(288); /* work area for code table building */
  lendyn: Uint32Array;         /* dynamic table for length/literal codes (JS specific) */
  distdyn: Uint32Array;        /* dynamic table for distance codes (JS specific) */
  sane = true;                 /* if false, allow invalid distance too far */
  back = -1;                   /* bits back of last unprocessed length/lit */
  was = 0;                     /* initial length of match */

  constructor() {
    this.lencode = this.lendyn = new Uint32Array(c.ENOUGH_LENS);
    this.distcode = this.distdyn = new Uint32Array(c.ENOUGH_DISTS);
  }
}