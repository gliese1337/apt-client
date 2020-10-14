import zlib_inflate from './zlib/inflate';
import c            from './zlib/constants';
import ZStream      from './zlib/zstream';
import GZheader     from './zlib/gzheader';

const chunkSize = 16384;

export default function * inflate(buffer: Uint8Array): Generator<Uint8Array> {
  const strm   = new ZStream(47);
  const header = new GZheader();

  zlib_inflate.inflateGetHeader(strm, header);

  // Flag to properly process Z_BUF_ERROR on testing inflate call
  // when we check that all output data was flushed.
  let allowBufError = false;

  let _mode = c.Z_NO_FLUSH;

  strm.input = buffer;
  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  let status: number;
  do {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }

    status = zlib_inflate.inflate(strm, c.Z_NO_FLUSH);    /* no bad return value */

    if (status === c.Z_BUF_ERROR && allowBufError === true) {
      status = c.Z_OK;
      allowBufError = false;
    }

    if (status !== c.Z_STREAM_END && status !== c.Z_OK) {
      return;
    }

    const size = strm.next_out;
    if (size) {
      const b = strm.output;
      if (b && (strm.avail_out === 0 || status === c.Z_STREAM_END || (strm.avail_in === 0 && (_mode === c.Z_FINISH || _mode === c.Z_SYNC_FLUSH)))) {
        yield b.length === size ? b : b.subarray(0, size);
      }
    }

    // When no more input data, we should check that internal inflate buffers
    // are flushed. The only way to do it when avail_out = 0 - run one more
    // inflate pass. But if output data not exists, inflate return Z_BUF_ERROR.
    // Here we set flag to process this error properly.
    //
    // NOTE. Deflate does not return error in this case and does not needs such
    // logic.
    if (strm.avail_in === 0 && strm.avail_out === 0) {
      allowBufError = true;
    }

  } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== c.Z_STREAM_END);
};