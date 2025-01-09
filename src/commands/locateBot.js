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
    .setDescription('Locate the title bot\'s current location'),
  async execute(interaction) {
    await interaction.reply('Processing... Please wait.');

    const pixelmatch = (await import('pixelmatch')).default;

    if (!fs.existsSync(BOT_IMAGES_DIR)) {
      fs.mkdirSync(BOT_IMAGES_DIR, { recursive: true });
    }

    const screenshotPath = path.join(BOT_IMAGES_DIR, 'rok_jumpFromMapBubble.png');
    const croppedImagePath = path.join(BOT_IMAGES_DIR, 'rok_jumpFromMapBubbleCropped.png');
    const referenceImagePath = path.join(REFERENCE_IMAGES_DIR, 'rok_jumpFromMapBubbleReference.png');

    exec(`adb exec-out screencap -p > ${screenshotPath}`, async (err) => {
      if (err) {
        console.error('Error taking screenshot:', err);
        return interaction.followUp('Failed to capture screenshot. Ensure ADB is configured and connected.');
      }

      console.log('Screenshot captured successfully.');

      const cropRegion = { left: 10, top: 900, width: 165, height: 165 };
      try {
        await sharp(screenshotPath).extract(cropRegion).toFile(croppedImagePath);
        console.log('Screenshot cropped successfully.');
      } catch (cropError) {
        console.error('Error cropping screenshot:', cropError);
        return interaction.followUp('Failed to process screenshot.');
      }

      if (!fs.existsSync(referenceImagePath)) {
        console.warn(`Reference image not found: ${referenceImagePath}`);
        return interaction.followUp('Reference image not found. Please add the reference image to proceed.');
      }

      const croppedImg = fs.createReadStream(croppedImagePath).pipe(new PNG());
      const referenceImg = fs.createReadStream(referenceImagePath).pipe(new PNG());

      croppedImg.on('parsed', () => {
        console.log('Cropped image parsed successfully.');
      });
      referenceImg.on('parsed', () => {
        console.log('Reference image parsed successfully.');
      });

      await new Promise((resolve, reject) => {
        let croppedData, referenceData;

        croppedImg.on('parsed', () => {
          croppedData = croppedImg.data;

          if (referenceData) {
            console.log('Starting pixelmatch comparison...');
            try {
              const diff = pixelmatch(
                croppedData,
                referenceData,
                null,
                croppedImg.width,
                croppedImg.height,
                { threshold: 0.1 }
              );

              console.log(`Pixelmatch completed. Difference: ${diff}`);
              resolve(diff);
            } catch (error) {
              console.error('Error during pixelmatch:', error);
              reject(error);
            }
          }
        });

        referenceImg.on('parsed', () => {
          referenceData = referenceImg.data;

          if (croppedData) {
            console.log('Starting pixelmatch comparison...');
            try {
              const diff = pixelmatch(
                croppedData,
                referenceData,
                null,
                croppedImg.width,
                croppedImg.height,
                { threshold: 0.1 }
              );

              console.log(`Pixelmatch completed. Difference: ${diff}`);
              resolve(diff);
            } catch (error) {
              console.error('Error during pixelmatch:', error);
              reject(error);
            }
          }
        });

        croppedImg.on('error', (error) => {
          console.error('Error parsing cropped image:', error);
          reject(error);
        });

        referenceImg.on('error', (error) => {
          console.error('Error parsing reference image:', error);
          reject(error);
        });
      })
        .then((diff) => {
          if (diff === 0) {
            console.log('Match found!');
            interaction.followUp('Match found! Positive case event triggered.');
          } else {
            console.log('No match found.');
            interaction.followUp('No match found. Alternate event triggered.');
          }
        })
        .catch((error) => {
          console.error('Error in image comparison:', error);
          interaction.followUp('An error occurred during image comparison.');
        });

      if (fs.existsSync(croppedImagePath)) {
        fs.unlinkSync(croppedImagePath);
        console.log('Temporary cropped image cleaned up.');
      }
    });
  },
};
