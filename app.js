const Jimp = require('jimp');
const inquirer = require('inquirer');
const fs = require('fs');

const outputFileSufix = '-with-watermark';
const imagesFolder = 'img/';
const brightnessIncreaseFactor = .2;
const contrastIncreaseFactor = .2;
const welcomeMessage = 'Hi! Welcome to "Watermark manager". Copy your image files to ' + imagesFolder + ' folder. Then you\'ll be able to use them in the app. Are you ready?';
const notSuchFilesMessage = '\nFollowing file(s) seem(s) to not exist: ';
const restartMessage = '\nProgram is going to restart, so you can try again.\n\n';
const errorMessage = '\nSomething went wrong... Try again!\n\n';
const successMessage1 = '\nDone! Check ';
const successMessage2 = '.\nNow You can try with another image.\n\n';

const addTextWatermarkToImage = async function(inputFile, outputFile, text, editOptions) {
  try {
    let image = Jimp.read(inputFile);
    let font = Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    image = await image;
    font = await font;
    const textData = {
      text,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
    };
    image.print(font, 0, 0, textData, image.getWidth(), image.getHeight());
    if(editOptions && editOptions.length){
      editImage(image, editOptions);
    }
    image.quality(100).writeAsync(outputFile);
  } catch(e) {
    process.stdout.write(errorMessage);
    process.exit();
  }
  process.stdout.write(successMessage1 + outputFile + successMessage2);
  startApp();
};

const addImageWatermarkToImage = async function(inputFile, outputFile, watermarkFile, editOptions) {
  try {
    let image = Jimp.read(inputFile);
    let watermark = Jimp.read(watermarkFile);
    image = await image;
    watermark = await watermark;
    const x = image.getWidth() / 2 - watermark.getWidth() / 2;
    const y = image.getHeight() / 2 - watermark.getHeight() / 2;
    image.composite(watermark, x, y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 0.5,
    });
    if(editOptions && editOptions.length){
      editImage(image, editOptions);
    }
    image.quality(100).writeAsync(outputFile);
  } catch(e) {
    process.stdout.write(errorMessage);
    process.exit();
  }
  process.stdout.write(successMessage1 + outputFile + successMessage2);
  startApp();
};

const editImage = (image, editOptions) => {
  for(const option of editOptions) {
    switch (option) {
    case 'Make image brighter': {
      image.brightness(brightnessIncreaseFactor);
      break;
    }
    case 'Increase contrast': {
      image.contrast(contrastIncreaseFactor);
      break;
    }
    case 'Make image b&w': {
      image.greyscale();
      break;
    }
    case 'Invert image': {
      image.invert();
      break;
    }
    default:
      break;
    }
  }
};

const prepareOutputFilename = inputFilename => {
  const inputFileNameParts = inputFilename.split('.');
  if(inputFileNameParts.length > 1){
    const extension = inputFileNameParts.pop();
    return inputFileNameParts.join('.') + outputFileSufix + '.' + extension;
  } else {
    return inputFilename + outputFileSufix;
  }
};

const checkIfFilesExist = (...paths) => {
  const nonExistingPaths = paths.filter(path =>
    !fs.existsSync(path)
  );
  nonExistingPaths.length && process.stdout.write(notSuchFilesMessage + nonExistingPaths.join(', ') + '.');
  return !nonExistingPaths.length;
};

const startApp = async () => {
  const answer = await inquirer.prompt([{
    name: 'start',
    message: welcomeMessage,
    type: 'confirm'
  }]);
  if(!answer.start) process.exit();
  const options = await inquirer.prompt([{
    name: 'inputImage',
    type: 'input',
    message: 'What file do you want to mark?',
    default: 'test.jpg',
  }, {
    name: 'watermarkType',
    type: 'list',
    message: 'What type of watermark would you add?',
    choices: ['Text watermark', 'Image watermark'],
  }]);
  const inputImagePath = imagesFolder + options.inputImage;
  const outputImagePath = imagesFolder + prepareOutputFilename(options.inputImage);
  const editOptions = await inquirer.prompt([{
    name: 'shouldBeEdited',
    message: 'Apart from adding a watermark, would you like to edit an image?',
    type: 'confirm'
  }]);
  if(editOptions.shouldBeEdited){
    const selectedOptions = await inquirer.prompt([{
      name: 'optionNames',
      type: 'checkbox',
      message: 'How would you like to edit an image?',
      choices: ['Make image brighter', 'Increase contrast', 'Make image b&w', 'Invert image'],
    }]);
    options.selectedOptions = selectedOptions.optionNames;
  }
  if(options.watermarkType === 'Text watermark') {
    const text = await inquirer.prompt([{
      name: 'value',
      type: 'input',
      message: 'Type your watermark text:',
    }]);
    options.watermarkText = text.value;
    if(checkIfFilesExist(inputImagePath)) {
      addTextWatermarkToImage(inputImagePath, outputImagePath, options.watermarkText, options.selectedOptions);
    } else {
      process.stdout.write(restartMessage);
      startApp();
    }
  } else {
    const image = await inquirer.prompt([{
      name: 'filename',
      type: 'input',
      message: 'Type your watermark name:',
      default: 'logo.png',
    }]);
    options.watermarkImagePath = imagesFolder + image.filename;
    if(checkIfFilesExist(inputImagePath, options.watermarkImagePath)){
      addImageWatermarkToImage(inputImagePath, outputImagePath, options.watermarkImagePath, options.selectedOptions);
    } else {
      process.stdout.write(restartMessage);
      startApp();
    }
  }
};

startApp();
