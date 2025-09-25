/**
 * Utility: checkPopUpSide
 *
 * Purpose:
 * - Captures a screenshot from an ADB-connected device.
 * - Scans for a reference image within the screenshot.
 * - If a match is found, simulates a tap on the detected position.
 *
 * Usage:
 * - Used to detect in-game UI elements (popups, buttons, icons).
 *
 * Security:
 * - Reference images must be trusted assets.
 * - Prevents uncontrolled clicks by requiring explicit matches.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { PNG } = require('pngjs');

const BOT_IMAGES_DIR = path.join(__dirname, '../images/botImages');
const REFERENCE_IMAGES_DIR = path.join(__dirname, '../images/referenceImages');

// Ensure bot images directory exists
if (!fs.existsSync(BOT_IMAGES_DIR)) {
  fs.mkdirSync(BOT_IMAGES_DIR, { recursive: true });
}

/**
 * Captures a screenshot, searches for a reference image, and clicks if found.
 *
 * @param {object} adbClient - Initialized ADB client.
 * @param {string} deviceId - ADB device ID (e.g., emulator-5554).
 * @param {string} referenceImageName - File name of the reference image.
 * @returns {Promise<boolean>} True if match found and clicked, false otherwise.
 */
async function findAndClickReference(adbClient, deviceId, referenceImageName) {
  const pixelmatch = (await import('pixelmatch')).default;

  return new Promise((resolve, reject) => {
    const screenshotPath = path.join(BOT_IMAGES_DIR, 'screenshot.png');
    const referenceImagePath = path.join(REFERENCE_IMAGES_DIR, referenceImageName);

    if (!fs.existsSync(referenceImagePath)) {
      console.error(`❌ Reference image not found: ${referenceImagePath}`);
      return reject(new Error(`Reference image missing: ${referenceImageName}`));
    }

    // --- Step 1: Capture Screenshot ---
    exec(`adb -s ${deviceId} exec-out screencap -p > ${screenshotPath}`, async (err) => {
      if (err) {
        console.error('❌ Screenshot capture failed:', err);
        return reject(err);
      }

      console.log(`✅ Screenshot saved: ${screenshotPath}`);

      try {
        const screenImage = PNG.sync.read(fs.readFileSync(screenshotPath));
        const referenceImage = PNG.sync.read(fs.readFileSync(referenceImagePath));

        const { width: screenWidth, height: screenHeight, data: screenData } = screenImage;
        const { width: refWidth, height: refHeight, data: refData } = referenceImage;

        let bestMatch = { x: -1, y: -1, diff: Infinity };

        // --- Step 2: Sliding Window Comparison ---
        for (let y = 0; y <= screenHeight - refHeight; y++) {
          for (let x = 0; x <= screenWidth - refWidth; x++) {
            const region = new PNG({ width: refWidth, height: refHeight });
            screenImage.bitblt(region, x, y, refWidth, refHeight, 0, 0);

            const diffPixels = pixelmatch(region.data, refData, null, refWidth, refHeight, {
              threshold: 0.1,
            });

            if (diffPixels < bestMatch.diff) {
              bestMatch = { x, y, diff: diffPixels };
            }
          }
        }

        // --- Step 3: Decide Best Match ---
        if (bestMatch.x !== -1 && bestMatch.y !== -1) {
          console.log(`🎯 Match found at: (${bestMatch.x}, ${bestMatch.y})`);
          await performAdbClick(adbClient, deviceId, bestMatch.x + refWidth / 2, bestMatch.y + refHeight / 2);
          resolve(true);
        } else {
          console.warn('⚠️ No match found.');
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
 * Executes an ADB tap at the specified coordinates.
 *
 * @param {object} adbClient - The ADB client instance.
 * @param {string} deviceId - Device ID.
 * @param {number} x - X coordinate.
 * @param {number} y - Y coordinate.
 */
async function performAdbClick(adbClient, deviceId, x, y) {
  try {
    console.log(`👆 Clicking at (${x}, ${y})`);
    await adbClient.shell(deviceId, `input tap ${x} ${y}`);
    await new Promise((r) => setTimeout(r, 750));
  } catch (err) {
    console.error(`❌ Failed to execute ADB click at (${x}, ${y}):`, err);
  }
}

module.exports = { findAndClickReference };
