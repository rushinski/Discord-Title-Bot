/**
 * /locate-bot Command
 *
 * Purpose:
 * - Captures the bot's current in-game location via ADB screenshots
 * - Uses image comparison to detect navigation events
 * - Extracts coordinates using OCR (Tesseract.js)
 * - Updates MongoDB with the last visited kingdom
 *
 * Security:
 * - Restricted to Administrators only
 * - All ADB interactions are wrapped in error handling
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { exec } = require('child_process');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const { PNG } = require('pngjs');
const LastVisited = require('../models/LastVisited');

const BOT_IMAGES_DIR = path.join(__dirname, '../images/botImages');
const REFERENCE_IMAGES_DIR = path.join(__dirname, '../images/referenceImages');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('locate-bot')
    .setDescription("Locate the title bot's current location"),

  async execute(interaction) {
    // --- Permission Check ---
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true,
      });
    }

    await interaction.reply({ content: '⏳ Processing... Please wait.', ephemeral: true });

    // Ensure images directory exists
    if (!fs.existsSync(BOT_IMAGES_DIR)) {
      fs.mkdirSync(BOT_IMAGES_DIR, { recursive: true });
    }

    // Paths for temporary images
    const screenshotPath = path.join(BOT_IMAGES_DIR, 'botLocate.png');
    const croppedImagePath = path.join(BOT_IMAGES_DIR, 'bubbleTypeCropped.png');
    const referenceImagePath1 = path.join(REFERENCE_IMAGES_DIR, 'rok_jumpToMapBubbleReference.png');
    const referenceImagePath2 = path.join(REFERENCE_IMAGES_DIR, 'rok_jumpToCityBubbleReference.png');

    // --- Step 1: Capture Screenshot ---
    exec(`adb exec-out screencap -p > ${screenshotPath}`, async (err) => {
      if (err) {
        console.error('❌ Error taking screenshot:', err);
        return interaction.followUp({
          content: '⚠️ Failed to capture screenshot. Ensure ADB is configured and connected.',
          ephemeral: true,
        });
      }

      // --- Step 2: Crop bubble region ---
      try {
        const cropRegion = { left: 41, top: 789, width: 73, height: 59 };
        await sharp(screenshotPath).extract(cropRegion).toFile(croppedImagePath);
      } catch (cropError) {
        console.error('❌ Error cropping screenshot:', cropError);
        return interaction.followUp({ content: '⚠️ Failed to process screenshot.', ephemeral: true });
      }

      // --- Step 3: Compare with reference images ---
      if (!fs.existsSync(referenceImagePath1) || !fs.existsSync(referenceImagePath2)) {
        return interaction.followUp({
          content: '⚠️ Reference images missing. Please add them before using this command.',
          ephemeral: true,
        });
      }

      const pixelmatch = (await import('pixelmatch')).default;
      const croppedImg = fs.createReadStream(croppedImagePath).pipe(new PNG());
      const referenceImg1 = fs.createReadStream(referenceImagePath1).pipe(new PNG());
      const referenceImg2 = fs.createReadStream(referenceImagePath2).pipe(new PNG());

      const compareImages = (croppedData, referenceData, width, height) =>
        pixelmatch(croppedData, referenceData, null, width, height, { threshold: 0.2 }) === 0;

      try {
        const [croppedData, referenceData1, referenceData2] = await Promise.all([
          new Promise((resolve, reject) => croppedImg.on('parsed', () => resolve(croppedImg.data)).on('error', reject)),
          new Promise((resolve, reject) => referenceImg1.on('parsed', () => resolve(referenceImg1.data)).on('error', reject)),
          new Promise((resolve, reject) => referenceImg2.on('parsed', () => resolve(referenceImg2.data)).on('error', reject)),
        ]);

        if (compareImages(croppedData, referenceData1, croppedImg.width, croppedImg.height)) {
          await handleEvent('map');
        } else if (compareImages(croppedData, referenceData2, croppedImg.width, croppedImg.height)) {
          await handleEvent('city');
        } else {
          return interaction.followUp({
            content: '⚠️ Title bot could not be located.',
            ephemeral: true,
          });
        }
      } catch (error) {
        console.error('❌ Error in image comparison:', error);
        return interaction.followUp({
          content: '⚠️ An error occurred during image comparison.',
          ephemeral: true,
        });
      }

      /**
       * Handle the detected navigation event
       */
      async function handleEvent(type) {
        // Tap interaction via ADB
        exec('adb shell input tap 77 819', (adbError) => {
          if (adbError) {
            console.error(`❌ ADB error during ${type} navigation:`, adbError);
            return interaction.followUp({
              content: '⚠️ Failed to perform ADB actions.',
              ephemeral: true,
            });
          }

          setTimeout(captureFullScreenshot, type === 'map' ? 1100 : 7100);
        });
      }

      /**
       * Capture a full screenshot and extract coordinates with OCR
       */
      async function captureFullScreenshot() {
        const fullScreenshotPath = path.join(BOT_IMAGES_DIR, 'fullScreen.png');
        const croppedCoordinatesPath = path.join(BOT_IMAGES_DIR, 'coordinatesCropped.png');

        exec(`adb exec-out screencap -p > ${fullScreenshotPath}`, async (captureErr) => {
          if (captureErr) {
            console.error('❌ Error taking full screenshot:', captureErr);
            return interaction.followUp({
              content: '⚠️ Failed to capture full screenshot.',
              ephemeral: true,
            });
          }

          try {
            await sharp(fullScreenshotPath)
              .extract({ left: 402, top: 11, width: 233, height: 42 })
              .toFile(croppedCoordinatesPath);

            // OCR extraction of coordinates
            const coordinatesText = await Tesseract.recognize(croppedCoordinatesPath, 'eng')
              .then(({ data: { text } }) => text.trim());

            // Build embed response
            const embed = new EmbedBuilder()
              .setTitle('📍 Title Bot Located')
              .setImage(`attachment://${path.basename(fullScreenshotPath)}`)
              .setFooter({ text: `Coordinates: ${coordinatesText}` })
              .setColor('Blue');

            await interaction.followUp({
              embeds: [embed],
              files: [fullScreenshotPath],
            });

            // Update MongoDB with last visited location
            const homeKD = process.env.HOME_KD || 'Unknown Kingdom';
            await LastVisited.updateOne({}, { kingdom: homeKD, updatedAt: new Date() }, { upsert: true });

          } catch (processingError) {
            console.error('❌ Error processing screenshots:', processingError);
            interaction.followUp('⚠️ An error occurred while processing the screenshots.');
          }
        });
      }

      // Cleanup cropped image
      if (fs.existsSync(croppedImagePath)) {
        fs.unlinkSync(croppedImagePath);
      }
    });
  },
};
