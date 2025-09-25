const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const sharp = require('sharp');
const { PNG } = require('pngjs');

const BOT_IMAGES_DIR = path.join(__dirname, '../images/botImages');
const REFERENCE_IMAGES_DIR = path.join(__dirname, '../images/referenceImages');

// Ensure bot images directory exists
if (!fs.existsSync(BOT_IMAGES_DIR)) {
  fs.mkdirSync(BOT_IMAGES_DIR, { recursive: true });
}

/**
 * Captures a screenshot, scans for the reference image, and clicks on the detected position.
 * @param {string} adbClient - The ADB client
 * @param {string} deviceId - The ADB device ID (e.g., 'emulator-5564')
 * @param {string} referenceImageName - The filename of the reference image (must be in `referenceImages` folder)
 * @returns {Promise<boolean>} - Returns `true` if a match is found and clicked, otherwise `false`
 */
async function findAndClickReference(adbClient, deviceId, referenceImageName) {
  const pixelmatch = (await import('pixelmatch')).default;

  return new Promise((resolve, reject) => {
    const screenshotPath = path.join(BOT_IMAGES_DIR, 'screenshot.png');
    const referenceImagePath = path.join(REFERENCE_IMAGES_DIR, referenceImageName);

    if (!fs.existsSync(referenceImagePath)) {
      console.error(`❌ Reference image not found: ${referenceImagePath}`);
      return reject(new Error('Reference image missing.'));
    }

    // Take a screenshot using ADB
    exec(`adb -s ${deviceId} exec-out screencap -p > ${screenshotPath}`, async (err) => {
      if (err) {
        console.error('❌ Error taking screenshot:', err);
        return reject(err);
      }

      console.log('✅ Screenshot captured:', screenshotPath);

      try {
        const screenImage = PNG.sync.read(fs.readFileSync(screenshotPath));
        const referenceImage = PNG.sync.read(fs.readFileSync(referenceImagePath));

        const { width: screenWidth, height: screenHeight, data: screenData } = screenImage;
        const { width: refWidth, height: refHeight, data: refData } = referenceImage;

        let bestMatch = { x: -1, y: -1, diff: Infinity };

        // Slide the reference image over the screenshot to find the best match
        for (let y = 0; y <= screenHeight - refHeight; y++) {
          for (let x = 0; x <= screenWidth - refWidth; x++) {
            let region = new PNG({ width: refWidth, height: refHeight });
            screenImage.bitblt(region, x, y, refWidth, refHeight, 0, 0);

            const diffPixels = pixelmatch(region.data, refData, null, refWidth, refHeight, { threshold: 0.1 });

            if (diffPixels < bestMatch.diff) {
              bestMatch = { x, y, diff: diffPixels };
            }
          }
        }

        if (bestMatch.x !== -1 && bestMatch.y !== -1) {
          console.log(`✅ Best match found at: (${bestMatch.x}, ${bestMatch.y})`);
          await performAdbClick(adbClient, deviceId, bestMatch.x + refWidth / 2, bestMatch.y + refHeight / 2);
          resolve(true);
        } else {
          console.log('❌ No match found.');
          resolve(false);
        }
      } catch (error) {
        console.error('❌ Error processing images:', error);
        reject(error);
      }
    });
  });
}

/**
 * Clicks at the given coordinates using ADB.
 * @param {object} adbClient - The ADB client
 * @param {string} deviceId - The ADB device ID
 * @param {number} x - X coordinate to tap
 * @param {number} y - Y coordinate to tap
 */
async function performAdbClick(adbClient, deviceId, x, y) {
  try {
    console.log(`🎯 Clicking at (${x}, ${y})`);
    await adbClient.shell(deviceId, `input tap ${x} ${y}`);
    await setTimeout(750);
  } catch (err) {
    console.error(`❌ Error executing ADB click at (${x}, ${y}):`, err);
  }
}

module.exports = { findAndClickReference };
