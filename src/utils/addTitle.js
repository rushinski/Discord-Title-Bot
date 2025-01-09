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

const MAP_ANIMATION_DURATION = 500; // Animation time for map transitions
const UI_ELEMENT_ANIMATION_DURATION = 750; // Animation time for UI changes

// Function to clear a text field by simulating multiple backspace presses
async function clearTextField(adbClient, deviceId, length = 20) {
  for (let i = 0; i < length; i++) {
    await adbClient.shell(deviceId, 'input keyevent 67'); // KEYCODE_DEL for backspace
    await setTimeout(50); // Small delay between key presses
  }
}

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
    await setTimeout(200); // Allow the input field to be focused
    await clearTextField(adbClient, deviceId, 20); // Clear existing text
    await adbClient.shell(deviceId, `input text ${kingdom}`);
    await setTimeout(500); // Wait for text entry to complete
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
    await setTimeout(UI_ELEMENT_ANIMATION_DURATION);

    // Enter X coordinate
    logger.info(`Entering X coordinate: ${x}`);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.X_COORDINATE_INPUT}`);
    await setTimeout(200);
    await clearTextField(adbClient, deviceId, 10);
    await adbClient.shell(deviceId, `input text ${x}`);
    await setTimeout(500);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
    await setTimeout(UI_ELEMENT_ANIMATION_DURATION);

    // Enter Y coordinate
    logger.info(`Entering Y coordinate: ${y}`);
    await adbClient.shell(deviceId, `input tap ${ELEMENT_POSITIONS.Y_COORDINATE_INPUT}`);
    await setTimeout(200);
    await clearTextField(adbClient, deviceId, 10);
    await adbClient.shell(deviceId, `input text ${y}`);
    await setTimeout(500);
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

