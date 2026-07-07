/**
 * Așteaptă un număr aleator de milisecunde între min și max (inclusiv).
 */
function randomDelayMs(minSeconds, maxSeconds) {
  const min = Math.min(minSeconds, maxSeconds);
  const max = Math.max(minSeconds, maxSeconds);
  const seconds = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, Math.round(seconds * 1000)));
}

module.exports = { randomDelayMs };
