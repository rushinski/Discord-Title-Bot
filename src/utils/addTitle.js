const { setTimeout } = require('timers/promises');
const adb = require('adbkit');
const LastVisitedModel = require('../models/LastVisited');

const ELEMENT_POSITIONS = {
  COORDINATES_SEARCH_BUTTON: "659 27",
  KINGDOM_ID_INPUT: "668 215",
  INPUT_OK_BUTTON: "1839 1029",
  X_COORDINATE_INPUT: "948 215",
  Y_COORDINATE_INPUT: "1181 215",
  COORDINATES_OVERLAY_SEARCH_BUTTON: "1332 215",
};

const UI_DELAY = 750;

/**
 * Add a title to a player in the specified kingdom and coordinates.
 * @param {object} params - Parameters for title assignment.
 */
async function addTitle({ adbClient, logger, kingdom, x, y, title, deviceId }) {
  if (!adbClient) {
    throw new Error('ADB Client is undefined. Ensure it\'s initialized and passed to addTitle.');
  }

  try {
    logger.info("Starting title assignment...");
    logger.info(`Using coordinates: x=${x}, y=${y}`);
    logger.info(`Assigning title: ${title}`);

    // Open coordinates search overlay
    logger.info("Clicking coordinates search button.");
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.COORDINATES_SEARCH_BUTTON}`);
    await setTimeout(UI_DELAY);

    // Enter kingdom ID
    logger.info("Entering kingdom ID.");
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.KINGDOM_ID_INPUT}`);
    await setTimeout(200); // Allow the input field to be focused
    await clearTextField(adbClient, deviceId, 20); // Clear existing text
    await adbClient.shell(deviceId, `input text ${kingdom}`);
    await setTimeout(600); // Wait for text entry to complete
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
    await setTimeout(UI_DELAY);

    // Enter X coordinate
    logger.info(`Entering X coordinate: ${x}`);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.X_COORDINATE_INPUT}`);
    await setTimeout(200);
    await clearTextField(adbClient, deviceId, 10);
    await adbClient.shell(deviceId, `input text ${x}`);
    await setTimeout(600);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
    await setTimeout(UI_DELAY);

    // Enter Y coordinate
    logger.info(`Entering Y coordinate: ${y}`);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.Y_COORDINATE_INPUT}`);
    await setTimeout(200);
    await clearTextField(adbClient, deviceId, 10);
    await adbClient.shell(deviceId, `input text ${y}`);
    await setTimeout(600);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
    await setTimeout(UI_DELAY);

    // Click the search button
    logger.info("Clicking coordinates overlay search button.");
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.COORDINATES_OVERLAY_SEARCH_BUTTON}`);
    await setTimeout(UI_DELAY);

    // Fetch the last visited kingdom globally
    const lastVisitedDoc = await LastVisitedModel.findOne({});
    const lastKingdom = lastVisitedDoc?.kingdom || null;

    // Calculate delay based on the last visited kingdom
    let delay;
    if (lastKingdom === kingdom) {
      delay = 2000; // Shorter delay if revisiting the same kingdom
    } else {
      delay = 5000; // Longer delay if switching kingdoms
    }

    logger.info(`Last visited kingdom: ${lastKingdom || 'none'}`);
    logger.info(`Currently visiting kingdom: ${kingdom || 'none'}`);
    logger.info(`Applying delay of ${delay}ms.`);
    await setTimeout(delay);

    logger.info('Completed title assignment tasks successfully.');

    // Update the globally last visited kingdom
    await LastVisitedModel.updateOne(
      {},
      { $set: { kingdom, updatedAt: new Date() } },
      { upsert: true }
    );
    logger.info(`Updated global last visited kingdom to: ${kingdom}`);
  } catch (error) {
    logger.error(`Error in addTitle function: ${error.message}`);
    throw error;
  }
}

module.exports = { addTitle };

/**
 * Clears a text field by simulating backspace presses.
 * @param {object} adbClient - The ADB client instance.
 * @param {string} deviceId - Target device ID.
 * @param {number} length - Number of backspace presses.
 */
async function clearTextField(adbClient, deviceId, length = 20) {
  for (let i = 0; i < length; i++) {
    await adbClient.shell(deviceId, 'input keyevent 67'); // KEYCODE_DEL for backspace
    await setTimeout(50); // Small delay between key presses
  }
}
