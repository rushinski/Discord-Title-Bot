const { SlashCommandBuilder } = require('discord.js');
const { exec } = require('child_process');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const BOT_IMAGES_DIR = path.join(__dirname, '../images/botImages');
const REFERENCE_IMAGES_DIR = path.join(__dirname, '../images/referenceImages');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('locate-bot')
    .setDescription("Locate the title bot's current location"),
  async execute(interaction) {
    await interaction.reply('Processing... Please wait.');

    const pixelmatch = (await import('pixelmatch')).default;

    if (!fs.existsSync(BOT_IMAGES_DIR)) {
      fs.mkdirSync(BOT_IMAGES_DIR, { recursive: true });
    }

    const screenshotPath = path.join(BOT_IMAGES_DIR, 'rok_locateBot.png');
    const croppedImagePath = path.join(BOT_IMAGES_DIR, 'rok_bubbleTypeCropped.png');
    const referenceImage1Path = path.join(REFERENCE_IMAGES_DIR, 'rok_jumpToMapBubbleReference.png');
    const referenceImage2Path = path.join(REFERENCE_IMAGES_DIR, 'rok_jumpToCityBubbleReference.png');

    exec(`adb exec-out screencap -p > ${screenshotPath}`, async (err) => {
      if (err) {
        return interaction.followUp('Failed to capture screenshot. Ensure ADB is configured and connected.');
      }

      const cropRegion = { left: 10, top: 900, width: 165, height: 165 };
      try {
        await sharp(screenshotPath).extract(cropRegion).toFile(croppedImagePath);
      } catch {
        return interaction.followUp('Failed to process screenshot.');
      }

      if (!fs.existsSync(referenceImage1Path) || !fs.existsSync(referenceImage2Path)) {
        return interaction.followUp('Reference images not found. Please add the reference images to proceed.');
      }

      const compareImages = async (croppedPath, referencePath) => {
        const croppedImg = PNG.sync.read(fs.readFileSync(croppedPath));
        const referenceImg = PNG.sync.read(fs.readFileSync(referencePath));

        return pixelmatch(
          croppedImg.data,
          referenceImg.data,
          null,
          croppedImg.width,
          croppedImg.height,
          { threshold: 0.1 }
        );
      };

      try {
        const diff1 = await compareImages(croppedImagePath, referenceImage1Path);
        if (diff1 === 0) {
          return interaction.followUp('Match found with Image 1! Event 1 triggered.');
        }

        const diff2 = await compareImages(croppedImagePath, referenceImage2Path);
        if (diff2 === 0) {
          return interaction.followUp('Match found with Image 2! Event 2 triggered.');
        }

        interaction.followUp('No matches found. Error occurred.');
      } catch {
        interaction.followUp('An error occurred during image comparison.');
      } finally {
        if (fs.existsSync(croppedImagePath)) {
          fs.unlinkSync(croppedImagePath);
        }
      }
    });
  },
};
