const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { exec } = require('child_process');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const { PNG } = require('pngjs');
const mongoose = require('mongoose');
require('dotenv').config();

const BOT_IMAGES_DIR = path.join(__dirname, '../images/botImages');
const REFERENCE_IMAGES_DIR = path.join(__dirname, '../images/referenceImages');

const LastVisited = require('../models/LastVisited'); // Assuming the model is in the `models` directory

module.exports = {
  data: new SlashCommandBuilder()
    .setName('locate-bot')
    .setDescription("Locate the title bot's current location"),
  async execute(interaction) {
    // Check if the user has admin permissions
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
    }

    await interaction.reply({ content: 'Processing... Please wait.', ephemeral: true });

    const pixelmatch = (await import('pixelmatch')).default;

    if (!fs.existsSync(BOT_IMAGES_DIR)) {
      fs.mkdirSync(BOT_IMAGES_DIR, { recursive: true });
    }

    const screenshotPath = path.join(BOT_IMAGES_DIR, 'botLocate.png');
    const croppedImagePath = path.join(BOT_IMAGES_DIR, 'bubbleTypeCropped.png');
    const referenceImagePath1 = path.join(REFERENCE_IMAGES_DIR, 'rok_jumpToMapBubbleReference.png');
    const referenceImagePath2 = path.join(REFERENCE_IMAGES_DIR, 'rok_jumpToCityBubbleReference.png');

    exec(`adb exec-out screencap -p > ${screenshotPath}`, async (err) => {
      if (err) {
        console.error('Error taking screenshot:', err);
        return interaction.followUp({
          content: 'Failed to capture screenshot. Ensure ADB is configured and connected.',
          ephemeral: true,
        });
      }

      console.log('Screenshot captured:', screenshotPath);

      const cropRegion = { left: 41, top: 789, width: 73, height: 59 };
      try {
        await sharp(screenshotPath).extract(cropRegion).toFile(croppedImagePath);
        console.log('Cropped image saved at:', croppedImagePath);
      } catch (cropError) {
        console.error('Error cropping screenshot:', cropError);
        return interaction.followUp({ content: 'Failed to process screenshot.', ephemeral: true });
      }

      if (!fs.existsSync(referenceImagePath1) || !fs.existsSync(referenceImagePath2)) {
        return interaction.followUp({
          content: 'Reference images not found. Please add the reference images to proceed.',
          ephemeral: true,
        });
      }

      const croppedImg = fs.createReadStream(croppedImagePath).pipe(new PNG());
      const referenceImg1 = fs.createReadStream(referenceImagePath1).pipe(new PNG());
      const referenceImg2 = fs.createReadStream(referenceImagePath2).pipe(new PNG());

      const compareImages = (croppedData, referenceData, width, height) => {
        return pixelmatch(croppedData, referenceData, null, width, height, { threshold: 0.2 }) === 0;
      };

      try {
        const [croppedData, referenceData1, referenceData2] = await Promise.all([
          new Promise((resolve, reject) => {
            croppedImg.on('parsed', () => resolve(croppedImg.data)).on('error', reject);
          }),
          new Promise((resolve, reject) => {
            referenceImg1.on('parsed', () => resolve(referenceImg1.data)).on('error', reject);
          }),
          new Promise((resolve, reject) => {
            referenceImg2.on('parsed', () => resolve(referenceImg2.data)).on('error', reject);
          }),
        ]);

        if (compareImages(croppedData, referenceData1, croppedImg.width, croppedImg.height)) {
          console.log('Match found with reference image 1.');
          await handleEvent('event1');
        } else if (compareImages(croppedData, referenceData2, croppedImg.width, croppedImg.height)) {
          console.log('Match found with reference image 2.');
          await handleEvent('event2');
        } else {
          console.error('No match found.');
          return interaction.followUp({
            content: 'Title bot could not be located.',
            ephemeral: true,
          });
        }
      } catch (error) {
        console.error('Error in image comparison:', error);
        return interaction.followUp({
          content: 'An error occurred during image comparison.',
          ephemeral: true,
        });
      }

      async function handleEvent(event) {
        if (event === 'event1') {
          exec('adb shell input tap 77 819', async (adbError) => {
            if (adbError) {
              console.error('Error during ADB click:', adbError);
              return interaction.followUp({
                content: 'Failed to perform ADB actions.',
                ephemeral: true,
              });
            }

            console.log('ADB action performed for event1.');
            setTimeout(captureFullScreenshot, 1100);
          });
        } else if (event === 'event2') {
          exec('adb shell input tap 77 819', (adbError1) => {
            if (adbError1) {
              console.error('Error during first click of event2:', adbError1);
              return interaction.followUp({
                content: 'Failed to perform ADB actions.',
                ephemeral: true,
              });
            }

            console.log('First click of event2 completed.');
            setTimeout(() => {
              exec('adb shell input tap 77 819', (adbError2) => {
                if (adbError2) {
                  console.error('Error during second click of event2:', adbError2);
                  return interaction.followUp({
                    content: 'Failed to perform ADB actions.',
                    ephemeral: true,
                  });
                }

                console.log('Second click of event2 completed.');
                setTimeout(captureFullScreenshot, 1100);
              });
            }, 6000);
          });
        }
      }

      async function captureFullScreenshot() {
        const fullScreenshotPath = path.join(BOT_IMAGES_DIR, 'fullScreen.png');
        const croppedCoordinatesPath = path.join(BOT_IMAGES_DIR, 'coordinatesCropped.png');

        exec(`adb exec-out screencap -p > ${fullScreenshotPath}`, async (captureErr) => {
          if (captureErr) {
            console.error('Error taking full screenshot:', captureErr);
            return interaction.followUp({
              content: 'Failed to capture full screenshot.',
              ephemeral: true,
            });
          }

          try {
            console.log('Full screenshot captured at:', fullScreenshotPath);

            await sharp(fullScreenshotPath)
              .extract({ left: 402, top: 11, width: 233, height: 42 })
              .toFile(croppedCoordinatesPath);

            const coordinatesText = await Tesseract.recognize(croppedCoordinatesPath, 'eng').then(
              ({ data: { text } }) => text.trim()
            );

            const embed = new EmbedBuilder()
            .setTitle('Title bot located')
            .setImage(`attachment://${path.basename(fullScreenshotPath)}`)
            .setFooter({ text: `📍Coordinates: ${coordinatesText}` }) // Moved the coordinates to the footer
            .setColor('Blue');
          
          await interaction.followUp({
            embeds: [embed],
            files: [fullScreenshotPath],
          });

            console.log('Embed sent successfully.');

            // Update the last visited kingdom
            const homeKD = process.env.HOME_KD || 'Unknown Kingdom';
            await LastVisited.updateOne(
              {},
              { kingdom: homeKD, updatedAt: new Date() },
              { upsert: true }
            );

            console.log(`Last visited kingdom updated to: ${homeKD}`);
          } catch (processingError) {
            console.error('Error processing screenshots:', processingError);
            interaction.followUp('An error occurred while processing the screenshots.');
          }
        });
      }

      if (fs.existsSync(croppedImagePath)) {
        fs.unlinkSync(croppedImagePath);
      }
    });
  },
};
