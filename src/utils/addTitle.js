require('dotenv').config();
const { setTimeout } = require('timers/promises');
const Location = require('../models/Location');

const ELEMENT_POSITIONS = {
  COORDINATES_SEARCH_BUTTON: "536 9",
  KINGDOM_ID_INPUT: "567.5 179",
  INPUT_OK_BUTTON: "1460.5 814.5",
  X_COORDINATE_INPUT: "798.5 179",
  Y_COORDINATE_INPUT: "991.5 179",
  COORDINATES_OVERLAY_SEARCH_BUTTON: "1102 179",
};

const MAP_ANIMATION_DURATION = 500;
const UI_ELEMENT_ANIMATION_DURATION = 750;

async function addTitle({ device, logger, kingdom, xCoord, yCoord }) {
  try {
    logger.info("Starting title assignment...");

    // Open coordinates search overlay
    logger.info("Clicking coordinates search button.");
    await device.shell(`input tap ${ELEMENT_POSITIONS.COORDINATES_SEARCH_BUTTON}`);
    await setTimeout(UI_ELEMENT_ANIMATION_DURATION);

    // Enter kingdom ID
    logger.info("Entering kingdom ID.");
    await device.shell(`input tap ${ELEMENT_POSITIONS.KINGDOM_ID_INPUT}`);
    await device.shell('input keyevent --longpress 67'); // Clear text
    await device.shell(`input text ${kingdom}`);
    await device.shell(`input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
    await setTimeout(UI_ELEMENT_ANIMATION_DURATION);

    // Enter X coordinate
    logger.info("Entering X coordinate.");
    await device.shell(`input tap ${ELEMENT_POSITIONS.X_COORDINATE_INPUT}`);
    await device.shell('input keyevent --longpress 67');
    await device.shell(`input text ${xCoord}`);
    await device.shell(`input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
    await setTimeout(UI_ELEMENT_ANIMATION_DURATION);

    // Enter Y coordinate
    logger.info("Entering Y coordinate.");
    await device.shell(`input tap ${ELEMENT_POSITIONS.Y_COORDINATE_INPUT}`);
    await device.shell('input keyevent --longpress 67');
    await device.shell(`input text ${yCoord}`);
    await device.shell(`input tap ${ELEMENT_POSITIONS.INPUT_OK_BUTTON}`);
    await setTimeout(UI_ELEMENT_ANIMATION_DURATION);

    // Click the search button
    logger.info("Clicking coordinates overlay search button.");
    await device.shell(`input tap ${ELEMENT_POSITIONS.COORDINATES_OVERLAY_SEARCH_BUTTON}`);
    await setTimeout(MAP_ANIMATION_DURATION);

    logger.info("Completed title assignment tasks successfully.");
  } catch (error) {
    logger.error(`Error in addTitle function: ${error.message}`);
    throw error;
  }
}


module.exports = { addTitle };
