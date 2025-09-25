/**
 * Utility: addTitle
 *
 * Purpose:
 * - Automates assigning a title in Rise of Kingdoms via ADB commands.
 * - Navigates through UI fields, enters kingdom/coordinates, and applies the title.
 * - Updates MongoDB with the last visited kingdom.
 * - Performs image recognition (via checkPopUpSide.js) to validate success.
 *
 * Security & Reliability:
 * - Relies on ADB input, which must be secured to prevent unauthorized control.
 * - All major steps wrapped in error handling with clear logging.
 */

const { setTimeout } = require('timers/promises');
const LastVisitedModel = require('../models/LastVisited');
const { matchScreenshotRegion } = require('./checkPopUpSide.js');

// UI element positions (ADB tap coordinates)
const ELEMENT_POSITIONS = {
  COORDINATES_SEARCH_BUTTON: '440 23',
  KINGDOM_ID_INPUT: '558 177',
  INPUT_OK_BUTTON: '1517 848',
  X_COORDINATE_INPUT: '800 182',
  Y_COORDINATE_INPUT: '998 186',
  COORDINATES_OVERLAY_SEARCH_BUTTON: '1110 182',
  GOVERNOR_CITY_HALL: '795 470',
  TITLE_WINDOW: '860 275',
  JUSTICE: '368 492',
  DUKE: '654 492',
  ARCHITECT: '939 491',
  SCIENTIST: '1224 492',
  CONFIRM_TITLE: '807 801',
};

const UI_DELAY = 750;

/**
 * Assign a title to a player in-game.
 *
 * @param {object} params - Parameters for title assignment.
 * @param {object} params.adbClient - Initialized ADB client.
 * @param {object} params.logger - Logger (console).
 * @param {string} params.kingdom - Target kingdom ID.
 * @param {number} params.x - X coordinate.
 * @param {number} params.y - Y coordinate.
 * @param {string} params.title - Title to assign (justice, duke, architect, scientist).
 * @param {string} params.deviceId - ADB device identifier.
 */
async function addTitle({ adbClient, logger, kingdom, x, y, title, deviceId }) {
  if (!adbClient) {
    throw new Error("ADB Client is undefined. Ensure it's initialized before calling addTitle.");
  }

  try {
    logger.info(`🎯 Starting title assignment for "${title}" at (${x}, ${y}) in kingdom ${kingdom}`);

    // --- Step 1: Open coordinates search overlay ---
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.COORDINATES_SEARCH_BUTTON}`);
    await setTimeout(UI_DELAY);

    // --- Step 2: Enter kingdom ID ---
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.KINGDOM_ID_INPUT}`);
    await setTimeout(200);
    await clearTextField(adbClient, deviceId, 10);
    await setTimeout(1000);
    await adbClient.shell(deviceId, `input text ${kingdom}`);
    await setTimeout(1000);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
    await setTimeout(UI_DELAY);

    // --- Step 3: Enter coordinates (X & Y) ---
    await enterCoordinate(adbClient, deviceId, ELEMENT_POSITIONS.X_COORDINATE_INPUT, x, logger, 'X');
    await enterCoordinate(adbClient, deviceId, ELEMENT_POSITIONS.Y_COORDINATE_INPUT, y, logger, 'Y');

    // --- Step 4: Execute search ---
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.COORDINATES_OVERLAY_SEARCH_BUTTON}`);
    await setTimeout(UI_DELAY);

    // --- Step 5: Delay logic based on kingdom change ---
    const lastVisitedDoc = await LastVisitedModel.findOne({});
    const lastKingdom = lastVisitedDoc?.kingdom || null;
    const delay = lastKingdom === kingdom ? 2000 : 5000;

    logger.info(`Last visited: ${lastKingdom || 'none'} | Current: ${kingdom} | Delay: ${delay}ms`);
    await setTimeout(delay);

    // Update DB with new last visited kingdom
    await LastVisitedModel.updateOne({}, { $set: { kingdom, updatedAt: new Date() } }, { upsert: true });

    // --- Step 6: Open governor menu ---
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.GOVERNOR_CITY_HALL}`);
    await setTimeout(UI_DELAY);

    // Optional image validation step
    try {
      const cropRegion = { left: 158, top: 159, width: 42, height: 30 };
      const isMatch = await matchScreenshotRegion(adbClient, deviceId, cropRegion, 'rok_goldenCrown.png');
      logger.info(`Crown validation result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    } catch (error) {
      logger.warn(`⚠️ Validation skipped: ${error.message}`);
    }

    // --- Step 7: Assign title ---
    await tapTitle(adbClient, deviceId, title, logger);

    // --- Step 8: Confirm ---
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.CONFIRM_TITLE}`);
    await setTimeout(UI_DELAY);

    logger.info(`🎉 Title assignment complete for "${title}".`);
  } catch (error) {
    logger.error(`❌ Error in addTitle: ${error.message}`);
    throw error;
  }
}

module.exports = { addTitle };

/**
 * Clears a text field by simulating backspace presses.
 */
async function clearTextField(adbClient, deviceId, length = 20) {
  for (let i = 0; i < length; i++) {
    await adbClient.shell(deviceId, 'input keyevent 67'); // KEYCODE_DEL
    await setTimeout(50);
  }
}

/**
 * Helper: enter a coordinate (X or Y).
 */
async function enterCoordinate(adbClient, deviceId, inputPos, value, logger, label) {
  logger.info(`Entering ${label} coordinate: ${value}`);
  await adbClient.shell(deviceId, `input tap ${inputPos}`);
  await setTimeout(200);
  await clearTextField(adbClient, deviceId, 5);
  await setTimeout(1000);
  await adbClient.shell(deviceId, `input text ${value}`);
  await setTimeout(1000);
  await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
  await setTimeout(UI_DELAY);
}

/**
 * Helper: tap the correct title position.
 */
async function tapTitle(adbClient, deviceId, title, logger) {
  switch (title) {
    case 'justice':
      await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.JUSTICE}`);
      break;
    case 'duke':
      await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.DUKE}`);
      break;
    case 'architect':
      await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.ARCHITECT}`);
      break;
    case 'scientist':
      await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.SCIENTIST}`);
      break;
    default:
      logger.warn(`⚠️ Unknown title: ${title}`);
      return;
  }
  await setTimeout(UI_DELAY);
  logger.info(`✅ Clicked on ${title} title.`);
}
