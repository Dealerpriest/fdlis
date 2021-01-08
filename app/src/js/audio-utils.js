/** @type { AudioContext } */
let audioCtx;
/** @type {AnalyserNode} */
let analyser;
/** @type { Float32Array } */
let buffer;

let animationId;

export async function createRMSMeter (stream) {
  await closeRMSMeter();
  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  const bufferLength = analyser.frequencyBinCount;

  buffer = new Float32Array(bufferLength);

  const source = audioCtx.createMediaStreamSource(stream);
  source.connect(analyser);
}

export async function closeRMSMeter () {
  if (audioCtx) {
    await audioCtx.close();
  }
}

export function attachRMSCallback (fn) {
  console.log(analyser.frequencyBinCount);
  function loop () {
    fn(getRMS());
    animationId = requestAnimationFrame(loop);
  }

  animationId = requestAnimationFrame(loop);
}

export function detachRMSCallback () {
  cancelAnimationFrame(animationId);
  // clearTimeout(animationId);
}

// export function startRMS () {
//   function loop () {
//     getRMS();
//     requestAnimationFrame(loop);
//   }

//   loop();
// }

function getRMS () {
  analyser.getFloatTimeDomainData(buffer);
  const sum = buffer.reduce((acc, sample, index) => {
    // console.log('sample:', sample, 'doubled:', sample * sample);
    // console.log(index, ': ', acc);
    return acc + (sample * sample);
  }, 0);
  // const avg = sum / buffer.length;
  // console.log(sum);
  // return avg;
  const rmsAmplitude = Math.sqrt(sum / buffer.length);
  return map(rmsAmplitude, 0, 0.5, 0, 1);
  // return 20 * Math.log10(rmsAmplitude);
  // return sum / buffer.length;
  // console.log(buffer);
}

const map = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;
