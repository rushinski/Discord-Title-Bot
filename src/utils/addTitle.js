require('dotenv').config();
const { setTimeout } = require('timers/promises');
const adb = require('adbkit');

const ELEMENT_POSITIONS = {
  COORDINATES_SEARCH_BUTTON: "659 27",
  KINGDOM_ID_INPUT: "668 215",
  INPUT_OK_BUTTON: "1839 1029",
  X_COORDINATE_INPUT: "948 215",
  Y_COORDINATE_INPUT: "1181 215",
  COORDINATES_OVERLAY_SEARCH_BUTTON: "1332 215",
};

const MAP_ANIMATION_DURATION = 500;
const UI_ELEMENT_ANIMATION_DURATION = 750;

async function addTitle({ adbClient, logger, kingdom, x, y, title, deviceId }) {
  if (!adbClient) {
    throw new Error("adbClient is undefined. Ensure it's initialized and passed to addTitle.");
  }

  try {
    logger.info("Starting title assignment...");

    // Validate inputs
    if (x === undefined || y === undefined) {
      throw new Error(`Coordinates are undefined. Received: x=${x}, y=${y}`);
    }

    logger.info(`Using coordinates: x=${x}, y=${y}`);
    logger.info(`Assigning title: ${title}`);

    // Open coordinates search overlay
    logger.info("Clicking coordinates search button.");
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.COORDINATES_SEARCH_BUTTON}`);
    await setTimeout(UI_ELEMENT_ANIMATION_DURATION);

    // Enter kingdom ID
    logger.info("Entering kingdom ID.");
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.KINGDOM_ID_INPUT}`);
    await adbClient.shell(deviceId, 'input keyevent --longpress 67'); // Clear text
    await adbClient.shell(deviceId, `input text ${kingdom}`);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
    await setTimeout(UI_ELEMENT_ANIMATION_DURATION);

    // Enter X coordinate
    logger.info(`Entering X coordinate: ${x}`);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.X_COORDINATE_INPUT}`);
    await adbClient.shell(deviceId, 'input keyevent --longpress 67');
    await adbClient.shell(deviceId, `input text ${x}`);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
    await setTimeout(UI_ELEMENT_ANIMATION_DURATION);

    // Enter Y coordinate
    logger.info(`Entering Y coordinate: ${y}`);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.Y_COORDINATE_INPUT}`);
    await adbClient.shell(deviceId, 'input keyevent --longpress 67');
    await adbClient.shell(deviceId, `input text ${y}`);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
    await setTimeout(UI_ELEMENT_ANIMATION_DURATION);

    // Click the search button
    logger.info("Clicking coordinates overlay search button.");
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.COORDINATES_OVERLAY_SEARCH_BUTTON}`);
    await setTimeout(MAP_ANIMATION_DURATION);

    logger.info("Completed title assignment tasks successfully.");
  } catch (error) {
    logger.error(`Error in addTitle function: ${error.message}`);
    throw error;
  }
}

module.exports = { addTitle };
